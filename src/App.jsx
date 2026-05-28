import { useEffect, useRef, useState } from "react";

const defaultPresets = [
  { name: "英単語", seconds: 7 },
  { name: "標準", seconds: 30 },
  { name: "じっくり", seconds: 90 },
];

function App() {
  const [startTime, setStartTime] = useState(30);
  const [cooldownTime, setCooldownTime] = useState(5);
  const [cooldownOn, setCooldownOn] = useState(false);

  const [targetOn, setTargetOn] = useState(false);
  const [targetQuestions, setTargetQuestions] = useState(10);
  const [completed, setCompleted] = useState(false);
  const [completedQuestions, setCompletedQuestions] = useState(0);

  const [time, setTime] = useState(30);
  const [progress, setProgress] = useState(100);
  const [question, setQuestion] = useState(1);
  const [running, setRunning] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [soundTheme, setSoundTheme] = useState("calm");
  const [pressedButton, setPressedButton] = useState("");
  const [flash, setFlash] = useState(false);
  const [finishFlash, setFinishFlash] = useState(false);
  const [remainingOnPause, setRemainingOnPause] = useState(30);
  const [remainingPrecise, setRemainingPrecise] = useState(30);
  const [isCooldown, setIsCooldown] = useState(false);

  const [showPresetModal, setShowPresetModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");

  const [presets, setPresets] = useState(() => {
    try {
      const saved = localStorage.getItem("qTimerPresets");
      return saved ? JSON.parse(saved) : defaultPresets;
    } catch {
      return defaultPresets;
    }
  });

  const startAtRef = useRef(null);
  const animationRef = useRef(null);
  const lastBeepSecondRef = useRef(null);
  const soundOnRef = useRef(soundOn);
  const soundThemeRef = useRef(soundTheme);
  const wakeLockRef = useRef(null);

  const presetHoldTimerRef = useRef(null);
  const presetLongPressTriggeredRef = useRef(false);

  const holdChangeTimeoutRef = useRef(null);
  const holdChangeIntervalRef = useRef(null);
  const holdChangeTriggeredRef = useRef(false);

  const audioContextRef = useRef(null);
  const calmBeepRef = useRef(null);
  const tensionBeepRef = useRef(null);

  const hasValidStartTime = startTime > 0;

  const isPaused =
    !running &&
    hasValidStartTime &&
    remainingPrecise > 0 &&
    time !== startTime &&
    !completed;

  const showSettings = !running && !isPaused && !isCooldown && !completed;

  const prepareAudioContext = async () => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }
  };

  const playInstantTone = async (frequency, duration, volume = 0.3) => {
    if (!soundOnRef.current) return;

    await prepareAudioContext();

    if (!audioContextRef.current) return;

    const audioContext = audioContextRef.current;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    gainNode.gain.value = volume;
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = "sine";
    oscillator.start();

    gainNode.gain.exponentialRampToValueAtTime(
      0.0001,
      audioContext.currentTime + duration
    );

    oscillator.stop(audioContext.currentTime + duration);
  };

  const startSound = async () => {
    if (!soundOnRef.current) return;

    if (soundThemeRef.current === "tension") {
      await playInstantTone(1200, 0.12, 0.35);
    } else {
      await playInstantTone(700, 0.15, 0.3);
    }
  };

  const playPreparedAudio = (audio, volume = 1) => {
    if (!audio || !soundOnRef.current) return;

    audio.pause();
    audio.currentTime = 0;
    audio.volume = volume;

    const playPromise = audio.play();

    if (playPromise) {
      playPromise.catch(() => {});
    }
  };

  const beep = () => {
    if (!soundOnRef.current) return;

    const audio =
      soundThemeRef.current === "tension"
        ? tensionBeepRef.current
        : calmBeepRef.current;

    playPreparedAudio(audio, 0.75);
  };

  const preloadBeepAudio = () => {
    const audios = [calmBeepRef.current, tensionBeepRef.current];

    audios.forEach((audio) => {
      if (!audio) return;
      audio.load();
    });
  };

  const triggerFinishGlow = () => {
    setFinishFlash(true);

    setTimeout(() => {
      setFinishFlash(false);
    }, 450);
  };

  const formatTime = (seconds) => {
    const safeSeconds = Math.max(0, Math.ceil(Number(seconds) || 0));
    const min = Math.floor(safeSeconds / 60);
    const sec = safeSeconds % 60;

    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const applyMainTime = (newTime) => {
    const safeTime = Math.max(1, Number(newTime) || 1);

    setStartTime(safeTime);
    setCompleted(false);
    setCompletedQuestions(0);
    setIsCooldown(false);
    setTime(safeTime);
    setProgress(100);
    setRemainingOnPause(safeTime);
    setRemainingPrecise(safeTime);
  };

  const changeMainTime = (delta) => {
    setStartTime((prev) => {
      const next = Math.max(1, prev + delta);

      setCompleted(false);
      setCompletedQuestions(0);
      setIsCooldown(false);
      setTime(next);
      setProgress(100);
      setRemainingOnPause(next);
      setRemainingPrecise(next);

      return next;
    });
  };

  const changeCooldownTime = (delta) => {
    setCooldownTime((prev) => Math.max(1, prev + delta));
  };

  const changeTargetQuestions = (delta) => {
    setTargetQuestions((prev) => Math.max(1, prev + delta));
    setCompleted(false);
    setCompletedQuestions(0);
  };

  const startHoldChange = (callback) => {
    stopHoldChange();

    holdChangeTriggeredRef.current = false;

    holdChangeTimeoutRef.current = setTimeout(() => {
      holdChangeTriggeredRef.current = true;
      callback();

      holdChangeIntervalRef.current = setInterval(() => {
        callback();
      }, 160);
    }, 450);
  };

  const stopHoldChange = () => {
    if (holdChangeTimeoutRef.current) {
      clearTimeout(holdChangeTimeoutRef.current);
      holdChangeTimeoutRef.current = null;
    }

    if (holdChangeIntervalRef.current) {
      clearInterval(holdChangeIntervalRef.current);
      holdChangeIntervalRef.current = null;
    }
  };

  const handleAdjustClick = (callback) => {
    if (holdChangeTriggeredRef.current) {
      holdChangeTriggeredRef.current = false;
      return;
    }

    callback();
  };

  const addPreset = () => {
    if (!hasValidStartTime || running) return;

    setNewPresetName("");
    setShowPresetModal(true);
  };

  const savePreset = () => {
    const name = newPresetName.trim();

    if (!name || !hasValidStartTime) return;

    setPresets((prev) => [
      ...prev,
      {
        name,
        seconds: startTime,
      },
    ]);

    setShowPresetModal(false);
  };

  const deletePreset = (indexToDelete) => {
    setPresets((prev) => prev.filter((_, index) => index !== indexToDelete));
  };

  const startPresetLongPress = (preset, index) => {
    if (running) return;

    presetLongPressTriggeredRef.current = false;

    presetHoldTimerRef.current = setTimeout(() => {
      presetLongPressTriggeredRef.current = true;

      const ok = confirm(`${preset.name} を削除しますか？`);

      if (ok) {
        deletePreset(index);
      }
    }, 650);
  };

  const endPresetLongPress = () => {
    if (presetHoldTimerRef.current) {
      clearTimeout(presetHoldTimerRef.current);
      presetHoldTimerRef.current = null;
    }
  };

  const requestWakeLock = async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      }
    } catch (err) {
      console.log(err);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };

  useEffect(() => {
    calmBeepRef.current = new Audio("/calm-beep.wav");
    tensionBeepRef.current = new Audio("/tension-beep.wav");

    calmBeepRef.current.preload = "auto";
    tensionBeepRef.current.preload = "auto";

    calmBeepRef.current.load();
    tensionBeepRef.current.load();
  }, []);

  useEffect(() => {
    localStorage.setItem("qTimerPresets", JSON.stringify(presets));
  }, [presets]);

  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  useEffect(() => {
    soundThemeRef.current = soundTheme;
  }, [soundTheme]);

  useEffect(() => {
    return () => {
      releaseWakeLock();
      stopHoldChange();
      endPresetLongPress();
    };
  }, []);

  useEffect(() => {
    if (!running) return;
    if (!hasValidStartTime) return;

    const currentDuration = isCooldown ? cooldownTime : startTime;

    startAtRef.current =
      performance.now() - (currentDuration - remainingOnPause) * 1000;

    lastBeepSecondRef.current = null;

    const update = () => {
      const duration = isCooldown ? cooldownTime : startTime;
      const elapsed = (performance.now() - startAtRef.current) / 1000;
      const remaining = Math.max(0, duration - elapsed);
      const percent =
        duration > 0 ? Math.max(0, (remaining / duration) * 100) : 0;
      const displayTime = Math.ceil(remaining);

      setRemainingPrecise(remaining);
      setProgress(percent);
      setTime(displayTime);

      if (
        !isCooldown &&
        hasValidStartTime &&
        displayTime <= 5 &&
        displayTime > 0 &&
        displayTime !== lastBeepSecondRef.current
      ) {
        beep();
        lastBeepSecondRef.current = displayTime;
      }

      if (remaining <= 0) {
        triggerFinishGlow();

        if (!isCooldown && targetOn && question >= targetQuestions) {
          startSound();

          setRunning(false);
          setCompleted(true);
          setCompletedQuestions(question);
          setIsCooldown(false);
          setProgress(100);
          releaseWakeLock();
          return;
        }

        if (!isCooldown && cooldownOn && cooldownTime > 0) {
          startSound();

          setIsCooldown(true);
          setRemainingOnPause(cooldownTime);
          setRemainingPrecise(cooldownTime);
          setTime(cooldownTime);
          setProgress(100);
          startAtRef.current = performance.now();
        } else {
          startSound();

          setQuestion((q) => q + 1);
          setIsCooldown(false);
          setRemainingOnPause(startTime);
          setRemainingPrecise(startTime);
          setTime(startTime);
          setProgress(100);
          startAtRef.current = performance.now();
        }

        lastBeepSecondRef.current = null;
      }

      animationRef.current = requestAnimationFrame(update);
    };

    animationRef.current = requestAnimationFrame(update);

    return () => cancelAnimationFrame(animationRef.current);
  }, [
    running,
    startTime,
    cooldownTime,
    cooldownOn,
    targetOn,
    targetQuestions,
    question,
    remainingOnPause,
    isCooldown,
    hasValidStartTime,
  ]);

  useEffect(() => {
    if (!isCooldown && hasValidStartTime && time <= 5 && time > 0) {
      setFlash(true);

      const timeout = setTimeout(() => {
        setFlash(false);
      }, 150);

      return () => clearTimeout(timeout);
    } else {
      setFlash(false);
    }
  }, [time, isCooldown, hasValidStartTime]);

  const resetTimer = () => {
    setRunning(false);
    setCompleted(false);
    setCompletedQuestions(0);
    setIsCooldown(false);
    setTime(startTime);
    setProgress(100);
    setQuestion(1);
    setRemainingOnPause(startTime);
    setRemainingPrecise(startTime);
    setFlash(false);
    releaseWakeLock();
  };

  return (
    <>
      <style>
        {`
          body {
            -webkit-user-select: none;
            user-select: none;
            -webkit-touch-callout: none;
          }

          @keyframes pop {
            0% {
              transform: scale(0.5);
              opacity: 0;
              color: #22c55e;
              text-shadow: 0 0 30px #22c55e;
            }

            50% {
              transform: scale(1.25);
              opacity: 1;
              color: #ffffff;
              text-shadow: 0 0 40px #22c55e;
            }

            100% {
              transform: scale(1);
              opacity: 1;
              color: #ffffff;
              text-shadow: none;
            }
          }

          @keyframes modalPop {
            0% {
              transform: scale(0.9);
              opacity: 0;
            }

            100% {
              transform: scale(1);
              opacity: 1;
            }
          }

          @keyframes finishGlow {
            0% {
              box-shadow: 0 0 0px rgba(34, 197, 94, 0);
              transform: scale(1);
            }

            50% {
              box-shadow:
                0 0 30px rgba(34, 197, 94, 0.9),
                0 0 60px rgba(34, 197, 94, 0.5);
              transform: scale(1.04);
            }

            100% {
              box-shadow: 0 0 0px rgba(34, 197, 94, 0);
              transform: scale(1);
            }
          }

          @keyframes cooldownGlow {
            0% {
              box-shadow:
                0 0 18px rgba(34, 197, 94, 0.45),
                0 0 36px rgba(34, 197, 94, 0.2);
            }

            50% {
              box-shadow:
                0 0 28px rgba(34, 197, 94, 0.8),
                0 0 54px rgba(34, 197, 94, 0.45);
            }

            100% {
              box-shadow:
                0 0 18px rgba(34, 197, 94, 0.45),
                0 0 36px rgba(34, 197, 94, 0.2);
            }
          }

          .finish-glow {
            animation: finishGlow 0.45s ease;
          }

          .cooldown-glow {
            animation: cooldownGlow 1.8s ease-in-out infinite;
          }

          .app-root {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            font-family: sans-serif;
            background-color: black;
            color: white;
            padding: 20px;
            padding-bottom: calc(20px + env(safe-area-inset-bottom));
            box-sizing: border-box;
            transition: background-color 0.15s;
            -webkit-user-select: none;
            user-select: none;
            -webkit-touch-callout: none;
          }

          .app-root.flash {
            background-color: #660000;
          }

          .complete-screen {
            min-height: 100vh;
            width: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            background-color: black;
            color: white;
            gap: 28px;
          }

          .complete-title {
            font-size: 58px;
            font-weight: bold;
            color: #22c55e;
            text-shadow: 0 0 24px rgba(34,197,94,0.9);
            letter-spacing: 2px;
          }

          .complete-result {
            text-align: center;
            line-height: 1.8;
            color: #aaa;
            font-size: 20px;
          }

          .reset-button {
            font-size: 22px;
            padding: 12px 30px;
            background-color: #666;
            color: white;
            border: none;
            border-radius: 999px;
            cursor: pointer;
            -webkit-user-select: none;
            user-select: none;
            -webkit-touch-callout: none;
            touch-action: manipulation;
          }

          .main-layout {
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .timer-circle {
            width: 270px;
            height: 270px;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 18px;
            flex-shrink: 0;
            transition: transform 0.08s linear;
            will-change: transform;
          }

          .timer-inner {
            width: 225px;
            height: 225px;
            border-radius: 50%;
            background-color: black;
            display: flex;
            justify-content: center;
            align-items: center;
            position: relative;
            overflow: hidden;
          }

          .timer-text {
            font-size: 58px;
            font-weight: bold;
          }

          .main-time-center {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            white-space: nowrap;
          }

          .cooldown-preview {
            position: absolute;
            top: 68%;
            left: 50%;
            transform: translateX(-50%);
            font-size: 15px;
            color: #888;
            white-space: nowrap;
          }

          .target-preview {
            position: absolute;
            top: 18%;
            left: 50%;
            transform: translateX(-50%);
            font-size: 13px;
            color: #777;
            white-space: nowrap;
          }

          .controls-panel {
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .adjust-panel {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-bottom: 16px;
            width: 260px;
            max-width: 92vw;
          }

          .adjust-row {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
          }

          .fixed-control-row {
            display: grid;
            grid-template-columns: 42px 64px 42px;
            justify-content: center;
            align-items: center;
            gap: 10px;
          }

          .sound-control-row {
            display: grid;
            grid-template-columns: 74px 64px 74px;
            justify-content: center;
            align-items: center;
            gap: 10px;
            margin-bottom: 20px;
          }

          .side-slot {
            width: 42px;
            height: 34px;
            display: flex;
            justify-content: center;
            align-items: center;
          }

          .sound-side-slot {
            width: 74px;
            height: 34px;
            display: flex;
            justify-content: center;
            align-items: center;
          }

          .adjust-label-button {
            min-width: 64px;
            height: 34px;
            border: none;
            border-radius: 999px;
            color: white;
            font-size: 13px;
            font-weight: bold;
            cursor: pointer;
            -webkit-user-select: none;
            user-select: none;
            -webkit-touch-callout: none;
            touch-action: manipulation;
          }

          .adjust-label-button.off {
            background-color: #555;
            opacity: 0.75;
          }

          .adjust-label-button.on {
            background-color: #22c55e;
          }

          .adjust-button {
            min-width: 42px;
            height: 34px;
            border: none;
            border-radius: 999px;
            background-color: #333;
            color: white;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            -webkit-user-select: none;
            user-select: none;
            -webkit-touch-callout: none;
            touch-action: manipulation;
          }

          .sound-option-button {
            min-width: 74px;
            height: 34px;
            border: none;
            border-radius: 999px;
            color: white;
            font-size: 13px;
            font-weight: bold;
            cursor: pointer;
            -webkit-user-select: none;
            user-select: none;
            -webkit-touch-callout: none;
            touch-action: manipulation;
          }

          .sound-option-button.calm {
            background-color: #3b82f6;
          }

          .sound-option-button.tension {
            background-color: #ef4444;
          }

          .sound-option-button.inactive {
            opacity: 0.45;
          }

          .preset-list {
            display: flex;
            gap: 10px;
            margin-bottom: 16px;
            flex-wrap: wrap;
            justify-content: center;
            max-width: 340px;
          }

          .preset-card {
            position: relative;
            min-width: 74px;
            min-height: 48px;
            padding: 8px 12px;
            border: none;
            border-radius: 16px;
            color: white;
            cursor: pointer;
            transition: transform 0.14s ease, box-shadow 0.14s ease, background-color 0.14s ease;
            -webkit-user-select: none;
            user-select: none;
            -webkit-touch-callout: none;
            touch-action: manipulation;
          }

          .preset-card.selected {
            background-color: #22c55e;
            transform: scale(1.08);
            box-shadow: 0 0 18px rgba(34, 197, 94, 0.75);
          }

          .preset-card.normal {
            background-color: #2a2a2a;
            transform: scale(1);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
          }

          .preset-card:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .preset-name {
            font-size: 14px;
            font-weight: bold;
            line-height: 1.1;
            margin-bottom: 3px;
          }

          .preset-seconds {
            font-size: 11px;
            color: rgba(255, 255, 255, 0.75);
          }

          .preset-add {
            min-width: 54px;
            min-height: 48px;
            border-radius: 16px;
            border: 1px dashed #555;
            background-color: #151515;
            color: white;
            font-size: 26px;
            cursor: pointer;
            -webkit-user-select: none;
            user-select: none;
            -webkit-touch-callout: none;
            touch-action: manipulation;
          }

          .preset-add:disabled {
            opacity: 0.45;
            cursor: not-allowed;
          }

          .main-buttons {
            display: flex;
            gap: 15px;
            margin-top: 12px;
          }

          @media (orientation: landscape) and (max-height: 500px) {
            .app-root {
              padding: 12px 24px;
              justify-content: center;
            }

            .question-title {
              position: fixed;
              top: 8px;
              left: 20px;
              font-size: 22px !important;
              opacity: 0.7;
              letter-spacing: 2px;
              margin: 0;
            }

            .complete-title {
              font-size: 48px;
            }

            .complete-result {
              font-size: 17px;
            }

            .main-layout {
              flex-direction: row;
              gap: 36px;
              align-items: center;
            }

            .timer-circle {
              width: 240px;
              height: 240px;
              margin-bottom: 0;
            }

            .timer-inner {
              width: 200px;
              height: 200px;
            }

            .timer-text {
              font-size: 52px;
            }

            .cooldown-preview {
              top: 69%;
              font-size: 13px;
            }

            .target-preview {
              top: 17%;
              font-size: 12px;
            }

            .adjust-panel {
              width: 250px;
              margin-bottom: 10px;
              gap: 7px;
            }

            .adjust-button {
              min-width: 36px;
              height: 30px;
              font-size: 16px;
            }

            .adjust-label-button {
              min-width: 58px;
              height: 30px;
              font-size: 12px;
            }

            .fixed-control-row {
              grid-template-columns: 36px 58px 36px;
              gap: 8px;
            }

            .sound-control-row {
              grid-template-columns: 66px 58px 66px;
              gap: 8px;
              margin-bottom: 12px;
            }

            .side-slot {
              width: 36px;
              height: 30px;
            }

            .sound-side-slot {
              width: 66px;
              height: 30px;
            }

            .sound-option-button {
              min-width: 66px;
              height: 30px;
              font-size: 12px;
            }

            .preset-list {
              margin-bottom: 10px !important;
              max-width: 280px;
              gap: 8px;
            }

            .preset-card {
              min-width: 66px;
              min-height: 42px;
              padding: 7px 10px;
              border-radius: 14px;
            }

            .preset-name {
              font-size: 13px;
            }

            .preset-seconds {
              font-size: 10px;
            }

            .preset-add {
              min-width: 48px;
              min-height: 42px;
              font-size: 24px;
            }

            .main-buttons {
              margin-top: 10px;
              gap: 10px;
            }

            .main-buttons button {
              font-size: 16px !important;
              padding: 9px 14px !important;
            }

            .paused-panel {
              padding: 18px 22px !important;
              gap: 14px !important;
            }

            .paused-panel button {
              font-size: 18px !important;
              padding: 10px 20px !important;
            }

            .preset-modal {
              padding: 22px !important;
              width: 260px !important;
            }
          }
        `}
      </style>

      <div className={`app-root ${flash ? "flash" : ""}`}>
        {completed ? (
          <div className="complete-screen">
            <div className="complete-title">COMPLETE</div>

            <div className="complete-result">
              <div>問題数　{completedQuestions}</div>
              <div>合計　{formatTime(completedQuestions * startTime)}</div>
            </div>

            <button className="reset-button" onClick={resetTimer}>
              RESET
            </button>
          </div>
        ) : (
          <>
            <h1
              key={isCooldown ? "cooldown" : question}
              className="question-title"
              style={{
                fontSize: "40px",
                animation: "pop 0.4s ease",
                color: isCooldown ? "#3b82f6" : "white",
                textShadow: isCooldown
                  ? "0 0 18px rgba(59,130,246,0.9)"
                  : "none",
              }}
            >
              {isCooldown ? "休憩" : `Q ${question}`}
            </h1>

            <div className="main-layout">
              <div
                className={`timer-circle
                  ${finishFlash ? "finish-glow" : ""}
                  ${isCooldown ? "cooldown-glow" : ""}
                `}
                style={{
                  background: `conic-gradient(
                    from 0deg,
                    #333 0% ${100 - progress}%,
                    ${
                      isCooldown
                        ? "#3b82f6"
                        : hasValidStartTime && time <= 5
                        ? "red"
                        : "lime"
                    } ${100 - progress}% 100%
                  )`,
                }}
              >
                <div className="timer-inner">
                  {showSettings && targetOn && (
                    <div className="target-preview">目標 {targetQuestions}</div>
                  )}

                  <div
                    className="timer-text main-time-center"
                    style={{
                      color: isCooldown
                        ? "#3b82f6"
                        : hasValidStartTime && time <= 5
                        ? "red"
                        : "white",
                    }}
                  >
                    {formatTime(showSettings ? startTime : time)}
                  </div>

                  {showSettings && cooldownOn && (
                    <div className="cooldown-preview">
                      {formatTime(cooldownTime)}
                    </div>
                  )}
                </div>
              </div>

              <div className="controls-panel">
                {showSettings && (
                  <>
                    <div className="adjust-panel">
                      <div className="adjust-row">
                        <button
                          className="adjust-button"
                          onClick={() =>
                            handleAdjustClick(() => changeMainTime(-1))
                          }
                          onPointerDown={(e) => {
                            e.preventDefault();
                            startHoldChange(() => changeMainTime(-10));
                          }}
                          onPointerUp={stopHoldChange}
                          onPointerLeave={stopHoldChange}
                          onPointerCancel={stopHoldChange}
                        >
                          －
                        </button>

                        <button
                          className="adjust-button"
                          onClick={() =>
                            handleAdjustClick(() => changeMainTime(1))
                          }
                          onPointerDown={(e) => {
                            e.preventDefault();
                            startHoldChange(() => changeMainTime(10));
                          }}
                          onPointerUp={stopHoldChange}
                          onPointerLeave={stopHoldChange}
                          onPointerCancel={stopHoldChange}
                        >
                          ＋
                        </button>
                      </div>

                      <div className="fixed-control-row">
                        <div className="side-slot">
                          {cooldownOn && (
                            <button
                              className="adjust-button"
                              onClick={() =>
                                handleAdjustClick(() =>
                                  changeCooldownTime(-1)
                                )
                              }
                              onPointerDown={(e) => {
                                e.preventDefault();
                                startHoldChange(() =>
                                  changeCooldownTime(-10)
                                );
                              }}
                              onPointerUp={stopHoldChange}
                              onPointerLeave={stopHoldChange}
                              onPointerCancel={stopHoldChange}
                            >
                              －
                            </button>
                          )}
                        </div>

                        <button
                          className={`adjust-label-button ${
                            cooldownOn ? "on" : "off"
                          }`}
                          onClick={() => {
                            setCooldownOn((v) => !v);
                          }}
                        >
                          休憩
                        </button>

                        <div className="side-slot">
                          {cooldownOn && (
                            <button
                              className="adjust-button"
                              onClick={() =>
                                handleAdjustClick(() =>
                                  changeCooldownTime(1)
                                )
                              }
                              onPointerDown={(e) => {
                                e.preventDefault();
                                startHoldChange(() =>
                                  changeCooldownTime(10)
                                );
                              }}
                              onPointerUp={stopHoldChange}
                              onPointerLeave={stopHoldChange}
                              onPointerCancel={stopHoldChange}
                            >
                              ＋
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="fixed-control-row">
                        <div className="side-slot">
                          {targetOn && (
                            <button
                              className="adjust-button"
                              onClick={() =>
                                handleAdjustClick(() =>
                                  changeTargetQuestions(-1)
                                )
                              }
                              onPointerDown={(e) => {
                                e.preventDefault();
                                startHoldChange(() =>
                                  changeTargetQuestions(-10)
                                );
                              }}
                              onPointerUp={stopHoldChange}
                              onPointerLeave={stopHoldChange}
                              onPointerCancel={stopHoldChange}
                            >
                              －
                            </button>
                          )}
                        </div>

                        <button
                          className={`adjust-label-button ${
                            targetOn ? "on" : "off"
                          }`}
                          onClick={() => {
                            setTargetOn((v) => !v);
                            setCompleted(false);
                            setCompletedQuestions(0);
                          }}
                        >
                          目標
                        </button>

                        <div className="side-slot">
                          {targetOn && (
                            <button
                              className="adjust-button"
                              onClick={() =>
                                handleAdjustClick(() =>
                                  changeTargetQuestions(1)
                                )
                              }
                              onPointerDown={(e) => {
                                e.preventDefault();
                                startHoldChange(() =>
                                  changeTargetQuestions(10)
                                );
                              }}
                              onPointerUp={stopHoldChange}
                              onPointerLeave={stopHoldChange}
                              onPointerCancel={stopHoldChange}
                            >
                              ＋
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="preset-list">
                      {presets.map((preset, index) => {
                        const selected = startTime === preset.seconds;

                        return (
                          <button
                            key={`${preset.name}-${index}`}
                            className={`preset-card ${
                              selected ? "selected" : "normal"
                            }`}
                            disabled={running}
                            onClick={() => {
                              if (presetLongPressTriggeredRef.current) {
                                presetLongPressTriggeredRef.current = false;
                                return;
                              }

                              applyMainTime(preset.seconds);
                            }}
                            onPointerDown={() =>
                              startPresetLongPress(preset, index)
                            }
                            onPointerUp={endPresetLongPress}
                            onPointerLeave={endPresetLongPress}
                            onPointerCancel={endPresetLongPress}
                          >
                            <div className="preset-name">{preset.name}</div>
                            <div className="preset-seconds">
                              {preset.seconds}秒
                            </div>
                          </button>
                        );
                      })}

                      <button
                        className="preset-add"
                        disabled={running || !hasValidStartTime}
                        onClick={addPreset}
                      >
                        ＋
                      </button>
                    </div>
                  </>
                )}

                <div className="sound-control-row">
                  <div className="sound-side-slot">
                    {soundOn && (
                      <button
                        className={`sound-option-button calm ${
                          soundTheme === "calm" ? "" : "inactive"
                        }`}
                        onClick={() => setSoundTheme("calm")}
                      >
                        Calm
                      </button>
                    )}
                  </div>

                  <button
                    className={`adjust-label-button ${
                      soundOn ? "on" : "off"
                    }`}
                    onClick={() => {
                      setSoundOn((v) => !v);
                    }}
                  >
                    SOUND
                  </button>

                  <div className="sound-side-slot">
                    {soundOn && (
                      <button
                        className={`sound-option-button tension ${
                          soundTheme === "tension" ? "" : "inactive"
                        }`}
                        onClick={() => setSoundTheme("tension")}
                      >
                        Tension
                      </button>
                    )}
                  </div>
                </div>

                {!isPaused && (
                  <div className="main-buttons">
                    {running ? (
                      <button
                        onMouseDown={() => setPressedButton("stop")}
                        onMouseUp={() => setPressedButton("")}
                        onMouseLeave={() => setPressedButton("")}
                        onTouchStart={() => setPressedButton("stop")}
                        onTouchEnd={() => setPressedButton("")}
                        onClick={() => {
                          setRunning(false);
                          setRemainingOnPause(remainingPrecise);
                          releaseWakeLock();
                        }}
                        style={{
                          fontSize: "20px",
                          padding: "10px 22px",
                          backgroundColor: "#ef4444",
                          color: "white",
                          border: "none",
                          borderRadius: "12px",
                          cursor: "pointer",
                          transition: "0.1s",
                          filter:
                            pressedButton === "stop"
                              ? "brightness(0.8)"
                              : "brightness(1)",
                          transform:
                            pressedButton === "stop"
                              ? "scale(0.95)"
                              : "scale(1)",
                        }}
                      >
                        STOP
                      </button>
                    ) : (
                      <button
                        disabled={!hasValidStartTime}
                        onClick={async () => {
                          if (!hasValidStartTime) return;

                          setCompleted(false);
                          setCompletedQuestions(0);
                          await prepareAudioContext();
                          preloadBeepAudio();

                          const currentDuration = isCooldown
                            ? cooldownTime
                            : startTime;

                          const isFreshStart =
                            remainingPrecise <= 0 ||
                            remainingPrecise >= currentDuration ||
                            completed;

                          if (isFreshStart) {
                            setRemainingOnPause(currentDuration);
                            setTime(currentDuration);
                          } else {
                            setRemainingOnPause(remainingPrecise);
                          }

                          await startSound();
                          setRunning(true);
                          requestWakeLock();
                        }}
                        style={{
                          fontSize: "20px",
                          padding: "10px 22px",
                          backgroundColor: "#22c55e",
                          color: "white",
                          border: "none",
                          borderRadius: "12px",
                          cursor: !hasValidStartTime
                            ? "not-allowed"
                            : "pointer",
                          opacity: !hasValidStartTime ? 0.5 : 1,
                        }}
                      >
                        ▶ START
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {isPaused && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  backgroundColor: "rgba(0,0,0,0.35)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 999,
                }}
              >
                <div
                  className="paused-panel"
                  style={{
                    display: "flex",
                    gap: "20px",
                    backgroundColor: "rgba(30,30,30,0.95)",
                    padding: "24px 28px",
                    borderRadius: "24px",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
                    animation: "modalPop 0.18s ease",
                  }}
                >
                  <button
                    onClick={() => {
                      setRunning(true);
                      requestWakeLock();
                    }}
                    style={{
                      fontSize: "24px",
                      padding: "14px 32px",
                      backgroundColor: "#22c55e",
                      color: "white",
                      border: "none",
                      borderRadius: "999px",
                      cursor: "pointer",
                    }}
                  >
                    ▶ 再開
                  </button>

                  <button
                    onClick={resetTimer}
                    style={{
                      fontSize: "24px",
                      padding: "14px 32px",
                      backgroundColor: "#666",
                      color: "white",
                      border: "none",
                      borderRadius: "999px",
                      cursor: "pointer",
                    }}
                  >
                    ↺ リセット
                  </button>
                </div>
              </div>
            )}

            {showPresetModal && (
              <div
                onClick={() => setShowPresetModal(false)}
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  backgroundColor: "rgba(0,0,0,0.55)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 1000,
                }}
              >
                <div
                  className="preset-modal"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    backgroundColor: "#1f1f1f",
                    padding: "24px",
                    borderRadius: "24px",
                    width: "280px",
                    textAlign: "center",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
                    animation: "modalPop 0.18s ease",
                  }}
                >
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: "bold",
                      marginBottom: "16px",
                    }}
                  >
                    プリセット追加
                  </div>

                  <input
                    autoFocus
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        savePreset();
                      }
                    }}
                    placeholder="セット名"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      fontSize: "18px",
                      padding: "12px",
                      borderRadius: "12px",
                      border: "none",
                      marginBottom: "18px",
                      textAlign: "center",
                    }}
                  />

                  <div
                    style={{
                      display: "flex",
                      gap: "12px",
                      justifyContent: "center",
                    }}
                  >
                    <button
                      onClick={savePreset}
                      style={{
                        fontSize: "17px",
                        padding: "10px 18px",
                        backgroundColor: "#22c55e",
                        color: "white",
                        border: "none",
                        borderRadius: "999px",
                        cursor: "pointer",
                      }}
                    >
                      保存
                    </button>

                    <button
                      onClick={() => setShowPresetModal(false)}
                      style={{
                        fontSize: "17px",
                        padding: "10px 18px",
                        backgroundColor: "#555",
                        color: "white",
                        border: "none",
                        borderRadius: "999px",
                        cursor: "pointer",
                      }}
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

export default App;