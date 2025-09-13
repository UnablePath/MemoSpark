# 🎵 Relaxation Sounds - Soothing Audio for Stress Relief

## 🌊 **Sound Library**

The relaxation corner supports both **generated sounds** (Web Audio API) and **custom audio files**.

### **Available Soundscapes:**

1. **🌊 Ocean Waves** - Gentle ocean waves for deep relaxation
2. **🌧️ Rain Sounds** - Soft rainfall for focus and calm
3. **🔥 Crackling Fire** - Warm fireplace ambience
4. **🌲 Forest Ambience** - Nature sounds with birds and wind

## 🎛️ **Implementation**

The system uses a hybrid approach:
- **Web Audio API**: Generates ambient sounds programmatically
- **Audio Files**: Optional MP3/OGG files for higher quality
- **Fallback System**: Gracefully handles missing files

### **Generated Sounds (Current)**
- Uses oscillators and noise generators
- Creates realistic ambient soundscapes
- Zero file size impact
- Works offline

### **Custom Audio Files (Optional)**
Place audio files here for enhanced quality:

```
public/sounds/relaxation/
├── ocean-waves.mp3
├── rain-sounds.mp3
├── crackling-fire.mp3
├── forest-ambience.mp3
└── README.md
```

## 🔧 **Features**

- **Loop Playback**: Seamless audio loops
- **Volume Control**: Adjustable volume slider
- **Play/Pause**: Individual sound control
- **Visual Feedback**: Animated indicators for active sounds
- **Accessibility**: Keyboard navigation and screen reader support

## 🎯 **Usage**

The relaxation sounds are integrated into the RelaxationCorner component:
- Navigate to "Calming Sounds" mode
- Select desired soundscape
- Adjust volume as needed
- Use play/pause controls

---

*Designed for optimal stress relief and focus enhancement! 🧘‍♀️*
