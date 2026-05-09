"use client";

import { InteractiveStu } from "@/components/stu/InteractiveStu";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Sparkles,
  Target,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";

import styles from "@/components/onboarding/WelcomeFlow.module.css";

interface WelcomeFlowProps {
  userName?: string;
  userSubjects?: string[];
  onComplete: () => void;
}

interface PersonalizedSuggestion {
  id: string;
  type: "task" | "schedule" | "tip";
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: string;
}

export const WelcomeFlow: React.FC<WelcomeFlowProps> = ({
  userName,
  userSubjects = [],
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [suggestions, setSuggestions] = useState<PersonalizedSuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    const generateSuggestions = async () => {
      setIsGenerating(true);

      await new Promise((resolve) => setTimeout(resolve, 1500));

      const personalizedSuggestions: PersonalizedSuggestion[] = [
        {
          id: "1",
          type: "task",
          title: "Create Your First Study Session",
          description:
            userSubjects.length > 0
              ? `I've prepared a ${userSubjects[0]} study plan for you!`
              : "Let's set up your first productive study session.",
          icon: (
            <Calendar
              className={styles.iconBlue}
              size={20}
              aria-hidden="true"
            />
          ),
          action: "Create Session",
        },
        {
          id: "2",
          type: "schedule",
          title: "Optimize Your Study Time",
          description:
            "Based on research, I recommend studying in 25-minute focused blocks.",
          icon: (
            <Target className={styles.iconGreen} size={20} aria-hidden="true" />
          ),
          action: "Set Schedule",
        },
        {
          id: "3",
          type: "tip",
          title: "Smart Study Tip",
          description:
            'Try the "explain it to someone else" technique to boost retention by 90%!',
          icon: (
            <Sparkles
              className={styles.iconPurple}
              size={20}
              aria-hidden="true"
            />
          ),
          action: "Learn More",
        },
      ];

      setSuggestions(personalizedSuggestions);
      setIsGenerating(false);
    };

    void generateSuggestions();
  }, [userSubjects]);

  const steps = [
    {
      title: `Welcome to MemoSpark${userName ? `, ${userName}` : ""}!`,
      content: (
        <div className={styles.center}>
          <div className={styles.stuWrap}>
            <InteractiveStu size={96} />
          </div>
          <p className={styles.muted}>
            I&apos;m Stu, your study sidekick. I&apos;ll use what you told us to
            suggest a few sensible next steps.
          </p>
        </div>
      ),
    },
    {
      title: "Suggestions to start with",
      content: (
        <div className={styles.suggestionList}>
          {isGenerating ? (
            <div className={styles.loadingBox}>
              <div className={styles.spinner} aria-hidden="true" />
              <p className={styles.muted}>
                Generating your personalized study plan...
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {suggestions.map((suggestion, index) => (
                <motion.div
                  key={suggestion.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.2 }}
                >
                  <div className={styles.suggestionCard}>
                    <div className={styles.suggestionRow}>
                      <div>{suggestion.icon}</div>
                      <div className={styles.suggestionBody}>
                        <h4 className={styles.suggestionTitle}>
                          {suggestion.title}
                        </h4>
                        <p className={styles.suggestionDesc}>
                          {suggestion.description}
                        </p>
                        {suggestion.action ? (
                          <button type="button" className={styles.btnSm}>
                            {suggestion.action}
                            <ArrowRight size={14} aria-hidden="true" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      ),
    },
    {
      title: "You're All Set!",
      content: (
        <div className={styles.center}>
          <div className={styles.successIcon}>
            <CheckCircle size={32} aria-hidden="true" />
          </div>
          <p className={styles.muted}>
            Your MemoSpark dashboard is ready! I&apos;ll continue learning your
            study patterns and providing smarter suggestions as you use the app.
          </p>
          <div className={styles.tipsBox}>
            <p className={styles.tipsTitle}>Quick Start Tips:</p>
            <ul className={styles.tipsList}>
              <li>Add your first task in the Tasks tab</li>
              <li>Check out the Gamification tab for achievements</li>
              <li>Visit the Connections tab to find study partners</li>
            </ul>
          </div>
        </div>
      ),
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <dialog
      className={styles.overlay}
      open
      aria-labelledby="welcome-flow-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={styles.modal}
      >
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.dots} aria-hidden="true">
              {steps.map((s, index) => (
                <div
                  key={s.title}
                  className={
                    index <= currentStep
                      ? `${styles.dot} ${styles.dotActive}`
                      : styles.dot
                  }
                />
              ))}
            </div>
            <button
              type="button"
              className={styles.btnGhost}
              onClick={handleSkip}
            >
              Skip
            </button>
          </div>
          <h2 id="welcome-flow-title" className={styles.title}>
            {steps[currentStep].title}
          </h2>
        </div>

        <div className={styles.body}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {steps[currentStep].content}
            </motion.div>
          </AnimatePresence>

          <div className={styles.footer}>
            <div className={styles.stepMeta}>
              {currentStep + 1} of {steps.length}
            </div>

            <button
              type="button"
              className={styles.btnPrimary}
              onClick={handleNext}
            >
              {currentStep === steps.length - 1 ? (
                <>
                  Get Started
                  <Sparkles size={18} aria-hidden="true" />
                </>
              ) : (
                <>
                  {currentStep === 0 ? "Show Me!" : "Continue"}
                  <ArrowRight size={18} aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </dialog>
  );
};
