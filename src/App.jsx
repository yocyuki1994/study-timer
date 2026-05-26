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

const startSound = (volume) => playSound(700, 0.15, volume);
const beep = (volume) => playSound(1000, 0.08, volume);

function App() {
  const [startTime, setStartTime] = useState(30);
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
  const [volume, setVolume] = useState(0.3);

  const startAtRef = useRef(null);
  const animationRef = useRef(null);
  const lastBeepSecondRef = useRef(null);
  const soundOnRef = useRef(soundOn);
  const wakeLockRef = useRef(null);

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
    soundOnRef.current = soundOn;
  }, [soundOn]);

  useEffect(() => {
    return () => {
      releaseWakeLock();
    };
  }, []);

  useEffect(() => {
    if (!running) return;

    startAtRef.current =
      performance.now() - (startTime - remainingOnPause) * 1000;

    lastBeepSecondRef.current = null;

    const update = () => {
      const elapsed = (performance.now() - startAtRef.current) / 1000;
      const remaining = Math.max(0, startTime - elapsed);
      const percent = Math.max(0, (remaining / startTime) * 100);
      const displayTime = Math.ceil(remaining);

      setRemainingPrecise(remaining);
      setProgress(percent);
      setTime(displayTime);

      if (
        soundOnRef.current &&
        displayTime <= 5 &&
        displayTime > 0 &&
        displayTime !== lastBeepSecondRef.current
      ) {
        beep(volume);
        lastBeepSecondRef.current = displayTime;
      }

      if (remaining <= 0) {
        if (soundOnRef.current) startSound(volume);

        setQuestion((q) => q + 1);
        setRemainingOnPause(startTime);
        startAtRef.current = performance.now();
        lastBeepSecondRef.current = null;
      }

      animationRef.current = requestAnimationFrame(update);
    };

    animationRef.current = requestAnimationFrame(update);

    return () => cancelAnimationFrame(animationRef.current);
  }, [running, startTime, remainingOnPause, volume]);

  useEffect(() => {
    if (time <= 5 && time > 0) {
      setFlash(true);

      const timeout = setTimeout(() => {
        setFlash(false);
      }, 150);

      return () => clearTimeout(timeout);
    }
  }, [time]);

  const resetTimer = () => {
    setRunning(false);
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
            width: 320px;
            height: 320px;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 30px;
            flex-shrink: 0;
          }

          .timer-inner {
            width: 270px;
            height: 270px;
            border-radius: 50%;
            background-color: black;
            display: flex;
            justify-content: center;
            align-items: center;
          }

          .timer-text {
            font-size: 70px;
            font-weight: bold;
          }

          .controls-panel {
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .main-buttons {
            display: flex;
            gap: 15px;
            margin-top: 20px;
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

            .controls-panel select {
              font-size: 16px !important;
              padding: 8px !important;
              margin-bottom: 12px !important;
            }

            .sound-button {
              margin-bottom: 12px !important;
            }

            .volume-box {
              margin-bottom: 10px !important;
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
          key={question}
          className="question-title"
          style={{
            fontSize: "40px",
            animation: "pop 0.4s ease",
          }}
        >
          問題 {question}
        </h1>

        <div className="main-layout">
          <div
            className="timer-circle"
            style={{
              background: `conic-gradient(
                from 0deg,
                #333 0% ${100 - progress}%,
                ${time <= 5 ? "red" : "lime"} ${100 - progress}% 100%
              )`,
            }}
          >
            <div className="timer-inner">
              <div
                className="timer-text"
                style={{
                  color: time <= 5 ? "red" : "white",
                }}
              >
                {`00:${String(time).padStart(2, "0")}`}
              </div>
            </div>
          </div>

          <div className="controls-panel">
            <select
              value={startTime}
              disabled={running}
              onChange={(e) => {
                const newTime = Number(e.target.value);
                setStartTime(newTime);
                setTime(newTime);
                setProgress(100);
                setRemainingOnPause(newTime);
                setRemainingPrecise(newTime);
              }}
              style={{
                fontSize: "20px",
                padding: "10px",
                marginBottom: "20px",
                borderRadius: "10px",
                opacity: running ? 0.5 : 1,
                cursor: running ? "not-allowed" : "pointer",
                backgroundColor: running ? "#444" : "white",
                color: running ? "#999" : "black",
              }}
            >
              <option value={15}>15秒</option>
              <option value={30}>30秒</option>
              <option value={60}>60秒</option>
              <option value={90}>90秒</option>
            </select>

            <button
              className="sound-button"
              onClick={() => {
                setSoundOn((v) => {
                  const next = !v;
                  if (next) startSound(volume);
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

            <div
              className="volume-box"
              style={{
                width: "220px",
                marginBottom: "20px",
              }}
            >
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                style={{
                  width: "100%",
                  cursor: "pointer",
                }}
              />

              <div
                style={{
                  textAlign: "center",
                  marginTop: "6px",
                  fontSize: "14px",
                  color: "#aaa",
                }}
              >
                音量 {Math.round(volume * 100)}%
              </div>
            </div>

            <div className="main-buttons">
              <button
                disabled={running}
                onClick={() => {
                  const isFreshStart =
                    remainingPrecise <= 0 || remainingPrecise >= startTime;

                  if (soundOn && isFreshStart) startSound(volume);

                  if (isFreshStart) {
                    setRemainingOnPause(startTime);
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
                  cursor: "pointer",
                  opacity: running ? 0.5 : 1,
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

              <button
                onMouseDown={() => setPressedButton("reset")}
                onMouseUp={() => setPressedButton("")}
                onMouseLeave={() => setPressedButton("")}
                onTouchStart={() => setPressedButton("reset")}
                onTouchEnd={() => setPressedButton("")}
                onClick={() => setShowResetConfirm(true)}
                style={{
                  fontSize: "20px",
                  padding: "10px 22px",
                  backgroundColor: "#666",
                  color: "white",
                  border: "none",
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "0.1s",
                  filter:
                    pressedButton === "reset"
                      ? "brightness(0.8)"
                      : "brightness(1)",
                  transform:
                    pressedButton === "reset" ? "scale(0.95)" : "scale(1)",
                }}
              >
                ↺ RESET
              </button>
            </div>
          </div>
        </div>

        {!running && time !== startTime && (
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
            <div //PAUSE用の黒いカードdiv
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
                onClick={() => setShowResetConfirm(true)}
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

        {showResetConfirm && (
          <div
            onClick={() => setShowResetConfirm(false)}
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
  className="reset-dialog"
  onClick={(e) => e.stopPropagation()}
  style={{
                backgroundColor: "#1f1f1f",
                animation: "modalPop 0.18s ease",
                padding: "28px",
                borderRadius: "24px",
                boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
                textAlign: "center",
                width: "280px",
              }}
            >
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  marginBottom: "12px",
                }}
              >
                リセットしますか？
              </div>

              <div
                style={{
                  fontSize: "14px",
                  color: "#aaa",
                  marginBottom: "24px",
                }}
              >
                問題番号とタイマーが最初に戻ります
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "center",
                }}
              >
                <button
                  onClick={resetTimer}
                  style={{
                    fontSize: "18px",
                    padding: "10px 18px",
                    backgroundColor: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "999px",
                    cursor: "pointer",
                  }}
                >
                  リセット
                </button>

                <button
                  onClick={() => setShowResetConfirm(false)}
                  style={{
                    fontSize: "18px",
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