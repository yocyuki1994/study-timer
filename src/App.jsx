import { useEffect, useMemo, useRef, useState } from "react";

const defaultPresets = [
  { name: "英単語", seconds: 7 },
  { name: "標準", seconds: 30 },
  { name: "じっくり", seconds: 90 },
];

function App() {
  const [mainMinutes, setMainMinutes] = useState(0);
  const [mainSeconds, setMainSeconds] = useState(30);
  const [cooldownMinutes, setCooldownMinutes] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(5);

  const startTime = mainMinutes * 60 + mainSeconds;
  const cooldownTime = cooldownMinutes * 60 + cooldownSeconds;

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

  const minuteOptions = useMemo(
    () => Array.from({ length: 60 }, (_, i) => i),
    []
  );

  const secondOptions = useMemo(
    () => Array.from({ length: 60 }, (_, i) => i),
    []
  );

  const startAtRef = useRef(null);
  const animationRef = useRef(null);
  const lastBeepSecondRef = useRef(null);
  const soundOnRef = useRef(soundOn);
  const soundThemeRef = useRef(soundTheme);
  const wakeLockRef = useRef(null);
  const holdTimerRef = useRef(null);
  const longPressTriggeredRef = useRef(false);

  const audioContextRef = useRef(null);
  const calmBeepRef = useRef(null);
  const tensionBeepRef = useRef(null);

  const hasValidStartTime = startTime > 0;

  const isPaused =
    !running && hasValidStartTime && remainingPrecise > 0 && time !== startTime;

  const showSettings = !running && !isPaused && !isCooldown;

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
    const minutes = Math.floor(safeTime / 60);
    const seconds = safeTime % 60;

    setMainMinutes(minutes);
    setMainSeconds(seconds);
    setIsCooldown(false);
    setTime(safeTime);
    setProgress(100);
    setRemainingOnPause(safeTime);
    setRemainingPrecise(safeTime);
  };

  const handleMainWheelChange = (minutes, seconds) => {
    const newTime = minutes * 60 + seconds;

    setMainMinutes(minutes);
    setMainSeconds(seconds);
    setIsCooldown(false);
    setTime(newTime);
    setProgress(100);
    setRemainingOnPause(newTime);
    setRemainingPrecise(newTime);
  };

  const handleCooldownWheelChange = (minutes, seconds) => {
    setCooldownMinutes(minutes);
    setCooldownSeconds(seconds);
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

    longPressTriggeredRef.current = false;

    holdTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;

      const ok = confirm(`${preset.name} を削除しますか？`);

      if (ok) {
        deletePreset(index);
      }
    }, 650);
  };

  const endPresetLongPress = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
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

        if (!isCooldown && cooldownTime > 0) {
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

          @keyframes pulse {
            0% {
              transform: scale(1);
            }

            50% {
              transform: scale(1.015);
            }

            100% {
              transform: scale(1);
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

          .danger-ring {
            animation: pulse 1s infinite;
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
          }

          .app-root.flash {
            background-color: #660000;
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
          }

          .timer-text {
            font-size: 58px;
            font-weight: bold;
          }

          .wheel-panel {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 190px;
            gap: 10px;
          }

          .wheel-block {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 5px;
          }

          .wheel-label {
            font-size: 12px;
            color: #aaa;
            letter-spacing: 1px;
          }

          .wheel-row {
            display: flex;
            align-items: center;
            gap: 5px;
          }

          .wheel-select {
            width: 54px;
            height: 38px;
            font-size: 20px;
            font-weight: bold;
            text-align: center;
            text-align-last: center;
            border: none;
            border-radius: 10px;
            background-color: #111;
            color: white;
            outline: none;
            appearance: none;
            -webkit-appearance: none;
            box-shadow: inset 0 0 0 1px #333;
          }

          .wheel-colon {
            font-size: 22px;
            font-weight: bold;
            color: white;
            margin: 0 1px;
          }

          .controls-panel {
            display: flex;
            flex-direction: column;
            align-items: center;
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
          }

          .preset-add:disabled {
            opacity: 0.45;
            cursor: not-allowed;
          }

          .toggle-row {
            display: flex;
            gap: 8px;
            margin-bottom: 20px;
            flex-wrap: wrap;
            justify-content: center;
          }

          .sound-button {
            font-size: 16px;
            padding: 8px 14px;
            border: none;
            border-radius: 999px;
            color: white;
            cursor: pointer;
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

            .wheel-panel {
              width: 170px;
              gap: 7px;
            }

            .wheel-label {
              font-size: 10px;
            }

            .wheel-select {
              width: 48px;
              height: 32px;
              font-size: 17px;
            }

            .wheel-colon {
              font-size: 18px;
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

            .toggle-row {
              margin-bottom: 12px !important;
            }

            .sound-button {
              font-size: 16px !important;
              padding: 7px 14px !important;
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
          {isCooldown ? "休憩" : `問題 ${question}`}
        </h1>

        <div className="main-layout">
          <div
            className={`timer-circle
              ${
                !isCooldown && hasValidStartTime && time <= 5
                  ? "danger-ring"
                  : ""
              }
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
              {showSettings ? (
                <div className="wheel-panel">
                  <div className="wheel-block">
                    <div className="wheel-label">時間</div>
                    <div className="wheel-row">
                      <select
                        className="wheel-select"
                        value={mainMinutes}
                        onChange={(e) => {
                          handleMainWheelChange(
                            Number(e.target.value),
                            mainSeconds
                          );
                        }}
                      >
                        {minuteOptions.map((num) => (
                          <option key={`main-min-${num}`} value={num}>
                            {String(num).padStart(2, "0")}
                          </option>
                        ))}
                      </select>

                      <div className="wheel-colon">:</div>

                      <select
                        className="wheel-select"
                        value={mainSeconds}
                        onChange={(e) => {
                          handleMainWheelChange(
                            mainMinutes,
                            Number(e.target.value)
                          );
                        }}
                      >
                        {secondOptions.map((num) => (
                          <option key={`main-sec-${num}`} value={num}>
                            {String(num).padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="wheel-block">
                    <div className="wheel-label">休憩</div>
                    <div className="wheel-row">
                      <select
                        className="wheel-select"
                        value={cooldownMinutes}
                        onChange={(e) => {
                          handleCooldownWheelChange(
                            Number(e.target.value),
                            cooldownSeconds
                          );
                        }}
                      >
                        {minuteOptions.map((num) => (
                          <option key={`cool-min-${num}`} value={num}>
                            {String(num).padStart(2, "0")}
                          </option>
                        ))}
                      </select>

                      <div className="wheel-colon">:</div>

                      <select
                        className="wheel-select"
                        value={cooldownSeconds}
                        onChange={(e) => {
                          handleCooldownWheelChange(
                            cooldownMinutes,
                            Number(e.target.value)
                          );
                        }}
                      >
                        {secondOptions.map((num) => (
                          <option key={`cool-sec-${num}`} value={num}>
                            {String(num).padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className="timer-text"
                  style={{
                    color: isCooldown
                      ? "#3b82f6"
                      : hasValidStartTime && time <= 5
                      ? "red"
                      : "white",
                  }}
                >
                  {formatTime(time)}
                </div>
              )}
            </div>
          </div>

          <div className="controls-panel">
            {showSettings && (
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
                        if (longPressTriggeredRef.current) {
                          longPressTriggeredRef.current = false;
                          return;
                        }

                        applyMainTime(preset.seconds);
                      }}
                      onTouchStart={() => startPresetLongPress(preset, index)}
                      onTouchEnd={endPresetLongPress}
                      onTouchCancel={endPresetLongPress}
                      onMouseDown={() => startPresetLongPress(preset, index)}
                      onMouseUp={endPresetLongPress}
                      onMouseLeave={endPresetLongPress}
                    >
                      <div className="preset-name">{preset.name}</div>
                      <div className="preset-seconds">{preset.seconds}秒</div>
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
            )}

            <div className="toggle-row">
              <button
                className="sound-button"
                onClick={() => {
                  setSoundOn((v) => !v);
                }}
                style={{
                  backgroundColor: soundOn ? "#22c55e" : "#555",
                }}
              >
                {soundOn ? "🔊 ON" : "🔇 OFF"}
              </button>

              <button
                className="sound-button"
                disabled={!soundOn}
                onClick={() => {
                  if (!soundOn) return;

                  setSoundTheme((prev) =>
                    prev === "calm" ? "tension" : "calm"
                  );
                }}
                style={{
                  backgroundColor: !soundOn
                    ? "#555"
                    : soundTheme === "calm"
                    ? "#3b82f6"
                    : "#ef4444",
                  opacity: soundOn ? 1 : 0.5,
                  cursor: soundOn ? "pointer" : "not-allowed",
                }}
              >
                {soundTheme === "calm" ? "🌙 Calm" : "⚡ Tension"}
              </button>
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
                        pressedButton === "stop" ? "scale(0.95)" : "scale(1)",
                    }}
                  >
                    STOP
                  </button>
                ) : (
                  <button
                    disabled={!hasValidStartTime}
                    onClick={async () => {
                      if (!hasValidStartTime) return;

                      await prepareAudioContext();
                      preloadBeepAudio();

                      const currentDuration = isCooldown
                        ? cooldownTime
                        : startTime;

                      const isFreshStart =
                        remainingPrecise <= 0 ||
                        remainingPrecise >= currentDuration;

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
                      cursor: !hasValidStartTime ? "not-allowed" : "pointer",
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
      </div>
    </>
  );
}

export default App;