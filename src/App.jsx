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
              transform: scale(0.7);
              opacity: 0;
            }
            70% {
              transform: scale(1.1);
            }
            100% {
              transform: scale(1);
              opacity: 1;
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
        `}
      </style>

      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "sans-serif",
          backgroundColor: flash ? "#660000" : "black",
          color: "white",
          padding: "20px",
          paddingBottom: "calc(20px + env(safe-area-inset-bottom))",
          boxSizing: "border-box",
          transition: "background-color 0.15s",
        }}
      >
        <h1
          key={question}
          style={{
            fontSize: "40px",
            animation: "pop 0.25s ease",
          }}
        >
          問題 {question}
        </h1>

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

        <div
          style={{
            width: "320px",
            height: "320px",
            borderRadius: "50%",
            background: `conic-gradient(
              from 0deg,
              #333 0% ${100 - progress}%,
              ${time <= 5 ? "red" : "lime"} ${100 - progress}% 100%
            )`,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: "30px",
          }}
        >
          <div
            style={{
              width: "270px",
              height: "270px",
              borderRadius: "50%",
              backgroundColor: "black",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: "70px",
                fontWeight: "bold",
                color: time <= 5 ? "red" : "white",
              }}
            >
              {`00:${String(time).padStart(2, "0")}`}
            </div>
          </div>
        </div>

        <button
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

        <div
          style={{
            display: "flex",
            gap: "15px",
            marginTop: "20px",
          }}
        >
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
            <div
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