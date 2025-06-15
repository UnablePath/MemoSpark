# Stu Celebration Animations

This directory contains Lottie JSON animation files for Stu's celebration system.

## 🔄 Placeholder Files Needed

Replace these placeholder paths with actual Lottie JSON files:

### Epic Celebrations
- `stu-epic-celebration.json` - For rare/legendary achievements
- Should include: dramatic effects, sparkles, confetti

### Level Up Celebrations  
- `stu-level-up-celebration.json` - For user level increases
- Should include: upward motion, stars, growth effects

### Achievement Celebrations
- `stu-achievement-celebration.json` - For regular achievement unlocks
- Should include: trophy/badge effects, happy Stu animations

### Streak Celebrations
- `stu-streak-celebration.json` - For streak milestones
- Should include: fire effects, consistency themes

### Coin Celebrations
- `stu-coin-celebration.json` - For earning coins
- Should include: coin spinning, wealth themes

### Task Completion
- `stu-happy-celebration.json` - For completing tasks
- Should include: checkmark, satisfied Stu

### Welcome/First Time
- `stu-welcome-celebration.json` - For first-time achievements
- Should include: welcome gestures, introduction themes

### Default
- `stu-default-celebration.json` - Fallback animation
- Should include: general happy celebration

## 🎨 Animation Guidelines

- **Duration**: 2-5 seconds per animation
- **Format**: Lottie JSON (exported from After Effects)
- **Size**: Optimized for web (< 100KB per file)
- **Style**: Match Stu's koala character design
- **Colors**: Use StudySpark brand colors

## 🔧 Integration

Once you add the Lottie files:

1. Uncomment the Lottie sections in `src/components/stu/CelebrationOverlay.tsx`
2. Remove or update the fallback `InteractiveStu` component
3. Test each celebration type using the demo component

## 📁 File Structure

```
public/animations/
├── stu-epic-celebration.json
├── stu-level-up-celebration.json  
├── stu-achievement-celebration.json
├── stu-streak-celebration.json
├── stu-coin-celebration.json
├── stu-happy-celebration.json
├── stu-welcome-celebration.json
└── stu-default-celebration.json
```

The system will automatically use these files when they're available! 