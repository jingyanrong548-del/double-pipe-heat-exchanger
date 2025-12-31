"""
Twisted Tube Geometry Generator
A robust Python class for generating 2D cross-section and 3D properties of twisted tubes.
"""

import numpy as np
import matplotlib.pyplot as plt
from typing import Tuple, Optional
from dataclasses import dataclass


@dataclass
class CrossSectionProperties:
    """Container for cross-section geometric properties."""
    area: float
    perimeter: float
    equivalent_diameter: float
    inner_diameter: float  # D_min (valley diameter)
    outer_diameter: float  # D_max (peak diameter)


class TwistedTube:
    """
    A class representing a generic twisted tube with lobed cross-section.
    
    The tube has a star-shaped (lobed) cross-section that follows a helical path
    along the axial direction. The cross-section is defined by:
    - Outer diameter (D_out): circumscribed circle diameter
    - Number of lobes (n): typically 3-6
    - Lobe height (h): depth from outer circle to valley
    - Spiral pitch (P): axial length for one full rotation
    
    Attributes:
        outer_diameter (float): Outer diameter (D_out) in meters
        num_lobes (int): Number of lobes/heads (n)
        lobe_height (float): Lobe height/depth (h) in meters
        spiral_pitch (float): Spiral pitch (P) in meters
        inner_diameter (float): Inner diameter (D_min) in meters
        avg_radius (float): Average radius (R_avg) in meters
        wave_amplitude (float): Wave amplitude (a) in meters
    """
    
    def __init__(
        self,
        outer_diameter: float,
        num_lobes: int,
        lobe_height: float,
        spiral_pitch: float
    ):
        """
        Initialize a TwistedTube instance.
        
        Args:
            outer_diameter: Outer diameter (D_out) in meters. Must be positive.
            num_lobes: Number of lobes/heads (n). Must be integer between 3-6.
            lobe_height: Lobe height/depth (h) in meters. Must be positive and 
                        less than outer radius.
            spiral_pitch: Spiral pitch (P) in meters. Must be positive.
        
        Raises:
            ValueError: If input parameters are invalid.
            TypeError: If num_lobes is not an integer.
        """
        # Input validation
        self._validate_inputs(outer_diameter, num_lobes, lobe_height, spiral_pitch)
        
        # Store parameters
        self.outer_diameter = float(outer_diameter)
        self.num_lobes = int(num_lobes)
        self.lobe_height = float(lobe_height)
        self.spiral_pitch = float(spiral_pitch)
        
        # Calculate derived geometric parameters
        self.outer_radius = self.outer_diameter / 2.0
        self.inner_diameter = self.outer_diameter - 2.0 * self.lobe_height
        self.inner_radius = self.inner_diameter / 2.0
        
        # Average radius and wave amplitude for polar coordinate generation
        self.avg_radius = (self.outer_radius + self.inner_radius) / 2.0
        self.wave_amplitude = self.lobe_height / 2.0
    
    @staticmethod
    def _validate_inputs(
        outer_diameter: float,
        num_lobes: int,
        lobe_height: float,
        spiral_pitch: float
    ) -> None:
        """
        Validate input parameters.
        
        Raises:
            ValueError: If any parameter is invalid.
            TypeError: If num_lobes is not an integer.
        """
        # Check num_lobes is integer
        if not isinstance(num_lobes, (int, np.integer)):
            raise TypeError(
                f"num_lobes must be an integer, got {type(num_lobes).__name__}"
            )
        
        # Check num_lobes range
        if not (3 <= num_lobes <= 6):
            raise ValueError(
                f"num_lobes must be between 3 and 6 (inclusive), got {num_lobes}"
            )
        
        # Check positive values
        if outer_diameter <= 0:
            raise ValueError(
                f"outer_diameter must be positive, got {outer_diameter}"
            )
        
        if lobe_height <= 0:
            raise ValueError(
                f"lobe_height must be positive, got {lobe_height}"
            )
        
        if spiral_pitch <= 0:
            raise ValueError(
                f"spiral_pitch must be positive, got {spiral_pitch}"
            )
        
        # Check lobe_height is physically possible
        outer_radius = outer_diameter / 2.0
        if lobe_height >= outer_radius:
            raise ValueError(
                f"lobe_height ({lobe_height}) must be less than outer_radius "
                f"({outer_radius})"
            )
    
    def generate_2d_profile(self, num_points: int = 1000) -> Tuple[np.ndarray, np.ndarray]:
        """
        Generate 2D cross-section profile using polar coordinates.
        
        The profile follows the equation:
            r(θ) = R_avg + a·cos(n·θ)
        
        where:
            R_avg = (R_outer + R_inner) / 2
            a = h / 2 (wave amplitude)
            n = num_lobes
        
        Args:
            num_points: Number of points to generate for the profile.
        
        Returns:
            Tuple of (theta, radius) arrays:
                - theta: Angular coordinates in radians (0 to 2π)
                - radius: Radial coordinates in meters
        """
        theta = np.linspace(0, 2 * np.pi, num_points)
        radius = self.avg_radius + self.wave_amplitude * np.cos(
            self.num_lobes * theta
        )
        
        return theta, radius
    
    def calculate_cross_section_properties(
        self,
        num_points: int = 1000
    ) -> CrossSectionProperties:
        """
        Calculate geometric properties of the cross-section.
        
        Uses numerical integration to compute area and perimeter.
        
        Args:
            num_points: Number of points for numerical integration.
        
        Returns:
            CrossSectionProperties object containing:
                - area: Cross-sectional area (m²)
                - perimeter: Cross-sectional perimeter (m)
                - equivalent_diameter: Hydraulic diameter (m)
                - inner_diameter: Valley diameter (D_min) (m)
                - outer_diameter: Peak diameter (D_max) (m)
        """
        theta, radius = self.generate_2d_profile(num_points)
        
        # Calculate area using polar integration: A = (1/2) ∫ r² dθ
        dtheta = 2 * np.pi / num_points
        area = 0.5 * np.sum(radius**2) * dtheta
        
        # Calculate perimeter using numerical integration
        # P = ∫ sqrt(r² + (dr/dθ)²) dθ
        dr_dtheta = -self.wave_amplitude * self.num_lobes * np.sin(
            self.num_lobes * theta
        )
        perimeter = np.sum(
            np.sqrt(radius**2 + dr_dtheta**2)
        ) * dtheta
        
        # Equivalent (hydraulic) diameter: D_h = 4A / P
        equivalent_diameter = 4.0 * area / perimeter if perimeter > 0 else 0.0
        
        return CrossSectionProperties(
            area=area,
            perimeter=perimeter,
            equivalent_diameter=equivalent_diameter,
            inner_diameter=self.inner_diameter,
            outer_diameter=self.outer_diameter
        )
    
    @property
    def helical_length_factor(self) -> float:
        """
        Calculate the helical length factor.
        
        This factor represents how much longer the actual helical path at the peak
        is compared to the axial length. For a point at the outer radius following
        a helical path:
        
            L_helical = L_axial × √(1 + (2πR_outer / P)²)
        
        Returns:
            Helical length factor (dimensionless)
        """
        if self.spiral_pitch <= 0:
            return 1.0
        
        # Circumference at outer radius
        circumference = 2 * np.pi * self.outer_radius
        
        # Helical path length factor
        factor = np.sqrt(1.0 + (circumference / self.spiral_pitch)**2)
        
        return factor
    
    @property
    def helical_path_length(self) -> float:
        """
        Calculate the helical path length for one full rotation at the peak.
        
        Returns:
            Helical path length in meters
        """
        return self.spiral_pitch * self.helical_length_factor
    
    def plot_cross_section(
        self,
        ax: Optional[plt.Axes] = None,
        num_points: int = 1000,
        show_properties: bool = True,
        **plot_kwargs
    ) -> plt.Axes:
        """
        Plot the 2D cross-section profile.
        
        Args:
            ax: Matplotlib axes object. If None, creates a new figure.
            num_points: Number of points for the profile.
            show_properties: If True, display geometric properties on the plot.
            **plot_kwargs: Additional keyword arguments passed to plot().
        
        Returns:
            Matplotlib axes object
        """
        if ax is None:
            fig, ax = plt.subplots(figsize=(8, 8), subplot_kw={'projection': 'polar'})
        else:
            # Ensure polar projection - check if it's a polar axes
            # Check if it has polar projection attributes
            if not hasattr(ax, 'set_thetalim'):
                raise ValueError("ax must be a polar axes object")
        
        # Generate profile
        theta, radius = self.generate_2d_profile(num_points)
        
        # Default plot style
        default_kwargs = {
            'linewidth': 2,
            'color': 'blue',
            'label': f'{self.num_lobes}-lobed tube'
        }
        default_kwargs.update(plot_kwargs)
        
        # Plot
        ax.plot(theta, radius, **default_kwargs)
        ax.set_ylim(0, self.outer_radius * 1.1)
        ax.set_title(
            f'Twisted Tube Cross-Section\n'
            f'D_out={self.outer_diameter*1000:.1f}mm, '
            f'n={self.num_lobes}, h={self.lobe_height*1000:.1f}mm',
            pad=20
        )
        ax.grid(True)
        ax.legend(loc='upper right')
        
        # Add properties text if requested
        if show_properties:
            props = self.calculate_cross_section_properties(num_points)
            info_text = (
                f'Area: {props.area*1e6:.2f} mm²\n'
                f'Perimeter: {props.perimeter*1000:.2f} mm\n'
                f'D_h: {props.equivalent_diameter*1000:.2f} mm\n'
                f'D_min: {props.inner_diameter*1000:.2f} mm'
            )
            ax.text(
                0.02, 0.98, info_text,
                transform=ax.transAxes,
                verticalalignment='top',
                bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.8),
                fontsize=9
            )
        
        return ax
    
    def plot_cartesian_cross_section(
        self,
        ax: Optional[plt.Axes] = None,
        num_points: int = 1000,
        **plot_kwargs
    ) -> plt.Axes:
        """
        Plot the 2D cross-section in Cartesian coordinates.
        
        Args:
            ax: Matplotlib axes object. If None, creates a new figure.
            num_points: Number of points for the profile.
            **plot_kwargs: Additional keyword arguments passed to plot().
        
        Returns:
            Matplotlib axes object
        """
        if ax is None:
            fig, ax = plt.subplots(figsize=(8, 8))
        
        # Generate profile
        theta, radius = self.generate_2d_profile(num_points)
        
        # Convert to Cartesian
        x = radius * np.cos(theta)
        y = radius * np.sin(theta)
        
        # Default plot style
        default_kwargs = {
            'linewidth': 2,
            'color': 'blue',
            'label': f'{self.num_lobes}-lobed tube'
        }
        default_kwargs.update(plot_kwargs)
        
        # Plot
        ax.plot(x, y, **default_kwargs)
        ax.set_aspect('equal')
        ax.set_xlabel('X (m)')
        ax.set_ylabel('Y (m)')
        ax.set_title(
            f'Twisted Tube Cross-Section (Cartesian)\n'
            f'D_out={self.outer_diameter*1000:.1f}mm, '
            f'n={self.num_lobes}, h={self.lobe_height*1000:.1f}mm'
        )
        ax.grid(True)
        ax.legend()
        
        return ax
    
    def __repr__(self) -> str:
        """String representation of the TwistedTube instance."""
        return (
            f"TwistedTube("
            f"outer_diameter={self.outer_diameter*1000:.1f}mm, "
            f"num_lobes={self.num_lobes}, "
            f"lobe_height={self.lobe_height*1000:.1f}mm, "
            f"spiral_pitch={self.spiral_pitch*1000:.1f}mm"
            f")"
        )


# Example usage
if __name__ == "__main__":
    # Example 1: 3-lobed tube
    tube_3lobe = TwistedTube(
        outer_diameter=0.034,  # 34 mm
        num_lobes=3,
        lobe_height=0.003,     # 3 mm
        spiral_pitch=0.0065    # 6.5 mm
    )
    
    print("3-lobed Tube:")
    print(tube_3lobe)
    props_3 = tube_3lobe.calculate_cross_section_properties()
    print(f"  Area: {props_3.area*1e6:.2f} mm²")
    print(f"  Equivalent Diameter: {props_3.equivalent_diameter*1000:.2f} mm")
    print(f"  Helical Length Factor: {tube_3lobe.helical_length_factor:.3f}")
    print()
    
    # Example 2: 6-lobed tube (default case)
    tube_6lobe = TwistedTube(
        outer_diameter=0.034,  # 34 mm
        num_lobes=6,
        lobe_height=0.003,     # 3 mm
        spiral_pitch=0.0065    # 6.5 mm
    )
    
    print("6-lobed Tube:")
    print(tube_6lobe)
    props_6 = tube_6lobe.calculate_cross_section_properties()
    print(f"  Area: {props_6.area*1e6:.2f} mm²")
    print(f"  Equivalent Diameter: {props_6.equivalent_diameter*1000:.2f} mm")
    print(f"  Helical Length Factor: {tube_6lobe.helical_length_factor:.3f}")
    print()
    
    # Plot both tubes
    fig, axes = plt.subplots(1, 2, figsize=(16, 8), subplot_kw={'projection': 'polar'})
    
    tube_3lobe.plot_cross_section(ax=axes[0], show_properties=True)
    tube_6lobe.plot_cross_section(ax=axes[1], show_properties=True, color='red')
    
    plt.tight_layout()
    plt.savefig('twisted_tube_comparison.png', dpi=150, bbox_inches='tight')
    print("Plot saved as 'twisted_tube_comparison.png'")
    
    # Cartesian plot comparison
    fig2, axes2 = plt.subplots(1, 2, figsize=(16, 8))
    
    tube_3lobe.plot_cartesian_cross_section(ax=axes2[0])
    tube_6lobe.plot_cartesian_cross_section(ax=axes2[1], color='red')
    
    plt.tight_layout()
    plt.savefig('twisted_tube_cartesian.png', dpi=150, bbox_inches='tight')
    print("Cartesian plot saved as 'twisted_tube_cartesian.png'")
    
    plt.show()

