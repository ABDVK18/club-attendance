import matplotlib.pyplot as plt
from matplotlib.ticker import MultipleLocator

# Corrected data arrays (removed the anomalous 2,333,000 Hz / 46.19 dB point)
frequencies = [27, 40, 280, 350, 470, 600, 1000, 2000, 3000, 721000, 1452000, 2111000, 2540000, 2998000, 3242000]
gain_db = [47.16, 48.30, 48.30, 48.30, 48.30, 48.16, 48.16, 48.16, 48.16, 47.46, 46.69, 45.85, 45.12, 44.51, 44.08]

# Set up the figure size
fig, ax = plt.subplots(figsize=(11, 7))

# Plot the precise curve on a semi-logarithmic x-axis
ax.semilogx(frequencies, gain_db, marker='o', linestyle='-', color='blue', linewidth=2, zorder=5)

# Formatting the graph limits to properly frame the data
ax.set_ylim(43, 49)
ax.set_xlim(10, 10000000)

# Simulate 1mm Graph Paper (10 subdivisions per major block)
# Y-axis: Major line every 1 dB, minor line every 0.1 dB
ax.yaxis.set_major_locator(MultipleLocator(1))
ax.yaxis.set_minor_locator(MultipleLocator(0.1))

# Grid Styling to mimic physical engineering paper (greenish lines)
ax.grid(which='major', color='#228B22', linestyle='-', linewidth=0.8, alpha=0.7) # Darker green major lines
ax.grid(which='minor', color='#32CD32', linestyle='-', linewidth=0.3, alpha=0.5) # Lighter green 1mm lines

# Labels and Title
ax.set_title('CE Amplifier Frequency Response (Bode Plot)', fontsize=14, fontweight='bold')
ax.set_xlabel('Frequency (Hz)', fontsize=12)
ax.set_ylabel('Voltage Gain (Av) in dB', fontsize=12)

# Highlight the Mid-Band Gain and Upper Cutoff (-3dB point)
ax.axhline(y=45.16, color='red', linestyle='--', linewidth=1.5, label='-3dB Threshold (45.16 dB)', zorder=4)
ax.axvline(x=2540000, color='red', linestyle='--', linewidth=1.5, label='f_H ≈ 2.54 MHz', zorder=4)

# Add legend and display
ax.legend(loc='lower left')
plt.tight_layout()
plt.show()