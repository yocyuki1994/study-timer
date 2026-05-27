import { useEffect, useRef, useState } from "react";

const audioContext = new AudioContext();

const playSound = (frequency, duration, volume = 0.3) => {
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

const startSound = () => playSound(700, 0.15);
const beep = () => playSound(1000, 0.08);

const defaultPresets = [
  { name: "英単語", seconds: 7 },
  { name: "標準", seconds: 30 },
  { name: "じっくり", seconds: 90 },
];

function App() {
  const [startTime, setStartTime] = useState(30);
  const [startTimeInput, setStartTimeInput] = useState("30");
  const [cooldownTime, setCooldownTime] = useState(5);
  const [cooldownTimeInput, setCooldownTimeInput] = useState("5");

  const [time, setTime] = useState(30);
  const [progress, setProgress] = useState(100);
  const [question, setQuestion] = useState(1);
  const [running, setRunning] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [pressedButton, setPressedButton] = useState("");
  const [flash, setFlash] = useState(false);
  const [remainingOnPause, setRemainingOnPause] = useState(30);
  const [remainingPrecise, setRemainingPrecise] = useState(30);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isCooldown, setIsCooldown] = useState(false);

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
  const wakeLockRef = useRef(null);

  const hasValidStartTime = startTimeInput !== "" && startTime > 0;

  const formatTime = (seconds) => {
    const safeSeconds = Math.max(0, Number(seconds) || 0);
    const min = Math.floor(safeSeconds / 60);
    const sec = safeSeconds % 60;

    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const applyMainTime = (newTime) => {
    setStartTime(newTime);
    setStartTimeInput(String(newTime));
    setIsCooldown(false);
    setTime(newTime);
    setProgress(100);
    setRemainingOnPause(newTime);
    setRemainingPrecise(newTime);
  };

  const addPreset = () => {
    if (!hasValidStartTime || running) return;

    const name = prompt("セット名を入力してください");

    if (!name) return;

    setPresets((prev) => [
      ...prev,
      {
        name,
        seconds: startTime,
      },
    ]);
  };

  const deletePreset = (indexToDelete) => {
    setPresets((prev) => prev.filter((_, index) => index !== indexToDelete));
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
    localStorage.setItem("qTimerPresets", JSON.stringify(presets));
  }, [presets]);

  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  useEffect(() => {
    return () => {
      releaseWakeLock();
    };
  }, []);

  useEffect(() => {
    if (!running) return;

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
        soundOnRef.current &&
        displayTime <= 5 &&
        displayTime > 0 &&
        displayTime !== lastBeepSecondRef.current
      ) {
        beep();
        lastBeepSecondRef.current = displayTime;
      }

      if (remaining <= 0) {
        if (!isCooldown && cooldownTime > 0) {
          if (soundOnRef.current) startSound();

          setIsCooldown(true);
          setRemainingOnPause(cooldownTime);
          setRemainingPrecise(cooldownTime);
          setTime(cooldownTime);
          setProgress(100);
          startAtRef.current = performance.now();
        } else {
          if (soundOnRef.current) startSound();

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
  }, [running, startTime, cooldownTime, remainingOnPause, isCooldown]);

  useEffect(() => {
    if (!isCooldown && time <= 5 && time > 0) {
      setFlash(true);

      const timeout = setTimeout(() => {
        setFlash(false);
      }, 150);

      return () => clearTimeout(timeout);
    }
  }, [time, isCooldown]);

  const resetTimer = () => {
    setRunning(false);
    setIsCooldown(false);
    setTime(startTime);
    setProgress(100);
    setQuestion(1);
    setRemainingOnPause(startTime);
    setRemainingPrecise(startTime);
    setFlash(false);
    setShowResetConfirm(false);
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

          .danger-ring {
            animation: pulse 1s infinite;
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

          .controls-panel {
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .time-inputs {
            display: flex;
            gap: 12px;
            margin-bottom: 12px;
          }

          .input-block {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
          }

          .input-label {
            font-size: 10px;
            color: #aaa;
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
            padding: 8px 22px 8px 12px;
            border: none;
            border-radius: 16px;
            color: white;
            cursor: pointer;
            transition: transform 0.14s ease, box-shadow 0.14s ease, background-color 0.14s ease;
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

          .preset-delete {
            position: absolute;
            top: -7px;
            right: -7px;
            width: 22px;
            height: 22px;
            border-radius: 999px;
            border: none;
            background-color: #ef4444;
            color: white;
            font-size: 14px;
            line-height: 22px;
            padding: 0;
            cursor: pointer;
            box-shadow: 0 3px 10px rgba(0,0,0,0.35);
          }

          .preset-delete:disabled {
            opacity: 0.45;
            cursor: not-allowed;
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
            transition: transform 0.14s ease, background-color 0.14s ease, border-color 0.14s ease;
          }

          .preset-add:hover {
            background-color: #222;
            border-color: #777;
            transform: scale(1.04);
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

            .controls-panel input {
              font-size: 16px !important;
              padding: 6px !important;
            }

            .time-inputs {
              margin-bottom: 10px !important;
            }

            .preset-list {
              margin-bottom: 10px !important;
              max-width: 280px;
              gap: 8px;
            }

            .preset-card {
              min-width: 66px;
              min-height: 42px;
              padding: 7px 20px 7px 10px;
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

            .sound-button {
              margin-bottom: 12px !important;
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

            .reset-dialog {
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
            color: isCooldown ? "#60a5fa" : "white",
          }}
        >
          {isCooldown ? "休憩" : `問題 ${question}`}
        </h1>

        <div className="main-layout">
          <div
            className={`timer-circle ${
              !isCooldown && time <= 5 ? "danger-ring" : ""
            }`}
            style={{
              background: `conic-gradient(
                from 0deg,
                #333 0% ${100 - progress}%,
                ${
                  isCooldown ? "#60a5fa" : time <= 5 ? "red" : "lime"
                } ${100 - progress}% 100%
              )`,
            }}
          >
            <div className="timer-inner">
              <div
                className="timer-text"
                style={{
                  color: isCooldown ? "#60a5fa" : time <= 5 ? "red" : "white",
                }}
              >
                {formatTime(time)}
              </div>
            </div>
          </div>

          <div className="controls-panel">
            {!running && time === startTime && !isCooldown && (
  <>
            <div className="time-inputs">
              <div className="input-block">
                <div className="input-label">時間</div>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={startTimeInput}
                  disabled={running}
                  onChange={(e) => {
                    const value = e.target.value;
                    setStartTimeInput(value);

                    if (value === "") {
                      setStartTime(0);
                      setTime(0);
                      setProgress(100);
                      setRemainingOnPause(0);
                      setRemainingPrecise(0);
                      setIsCooldown(false);
                      return;
                    }

                    const newTime = Number(value);

                    if (newTime < 1) return;

                    applyMainTime(newTime);
                  }}
                  style={{
                    fontSize: "16px",
                    padding: "6px",
                    borderRadius: "10px",
                    width: "64px",
                    textAlign: "center",
                    opacity: running ? 0.5 : 1,
                    cursor: running ? "not-allowed" : "text",
                    backgroundColor: running ? "#444" : "white",
                    color: running ? "#999" : "black",
                    border: "none",
                  }}
                />
              </div>

              <div className="input-block">
                <div className="input-label">休憩</div>
                <input
                  type="number"
                  min="0"
                  max="999"
                  value={cooldownTimeInput}
                  disabled={running}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCooldownTimeInput(value);

                    if (value === "") {
                      setCooldownTime(0);
                      return;
                    }

                    const newTime = Number(value);

                    if (newTime < 0) return;

                    setCooldownTime(newTime);
                  }}
                  style={{
                    fontSize: "16px",
                    padding: "6px",
                    borderRadius: "10px",
                    width: "64px",
                    textAlign: "center",
                    opacity: running ? 0.5 : 1,
                    cursor: running ? "not-allowed" : "text",
                    backgroundColor: running ? "#444" : "white",
                    color: running ? "#999" : "black",
                    border: "none",
                  }}
                />
              </div>
            </div>

            <div className="preset-list">
              {presets.map((preset, index) => {
                const selected = startTime === preset.seconds;

                return (
                  <div key={`${preset.name}-${index}`} style={{ position: "relative" }}>
                    <button
  className={`preset-card ${selected ? "selected" : "normal"}`}
  disabled={running}
  onClick={() => {
    applyMainTime(preset.seconds);
  }}
  onTouchStart={() => {
    preset.holdTimer = setTimeout(() => {
      const ok = confirm(`${preset.name} を削除しますか？`);

      if (ok) {
        deletePreset(index);
      }
    }, 600);
  }}
  onTouchEnd={() => {
    clearTimeout(preset.holdTimer);
  }}
  onMouseDown={() => {
    preset.holdTimer = setTimeout(() => {
      const ok = confirm(`${preset.name} を削除しますか？`);

      if (ok) {
        deletePreset(index);
      }
    }, 600);
  }}
  onMouseUp={() => {
    clearTimeout(preset.holdTimer);
  }}
  onMouseLeave={() => {
    clearTimeout(preset.holdTimer);
  }}
>
  <div className="preset-name">{preset.name}</div>
  <div className="preset-seconds">{preset.seconds}秒</div>
</button>

                    
                  </div>
                );
              })}

              <button
                className="preset-add"
                disabled={running || !hasValidStartTime}
                onClick={addPreset}
                aria-label="プリセットを追加"
              >
                ＋
              </button>
            </div>
              </>
)}

<button
              className="sound-button"
              onClick={() => {
                setSoundOn((v) => {
                  const next = !v;
                  if (next) startSound();
                  return next;
                });
              }}
              style={{
                fontSize: "18px",
                padding: "8px 20px",
                marginBottom: "20px",
                backgroundColor: soundOn ? "#22c55e" : "#555",
                color: "white",
                border: "none",
                borderRadius: "999px",
                cursor: "pointer",
              }}
            >
              {soundOn ? "🔊 ON" : "🔇 OFF"}
            </button>

            <div className="main-buttons">
              <button
                disabled={running || !hasValidStartTime}
                onClick={() => {
                  const currentDuration = isCooldown
                    ? cooldownTime
                    : startTime;

                  const isFreshStart =
                    remainingPrecise <= 0 ||
                    remainingPrecise >= currentDuration;

                  if (soundOn && isFreshStart) startSound();

                  if (isFreshStart) {
                    setRemainingOnPause(currentDuration);
                    setTime(currentDuration);
                  } else {
                    setRemainingOnPause(remainingPrecise);
                  }

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
                  cursor:
                    running || !hasValidStartTime ? "not-allowed" : "pointer",
                  opacity: running || !hasValidStartTime ? 0.5 : 1,
                }}
              >
                ▶ START
              </button>

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
                ⏸ STOP
              </button>
            </div>
          </div>
        </div>

        {!running &&
          hasValidStartTime &&
          remainingPrecise > 0 &&
          time !== startTime && (
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
                pointerEvents: "auto",
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
                  backdropFilter: "blur(8px)",
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
      </div>
    </>
  );
}

export default App;