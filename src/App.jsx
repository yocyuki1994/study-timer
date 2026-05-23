import { useEffect, useState } from "react";

const audioContext = new AudioContext();

const playSound = (frequency, duration) => {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

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

const startSound = () => {
  playSound(700, 0.15);
};

const beep = () => {
  playSound(1000, 0.08);
};

function App() {
  const [startTime, setStartTime] = useState(30);

  const [time, setTime] = useState(30);
  const [question, setQuestion] = useState(1);
  const [running, setRunning] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [pressedButton, setPressedButton] = useState("");

  useEffect(() => {
    if (!running) return;

    const timer = setInterval(() => {
      setTime((prev) => {
        if (prev <= 5 && prev > 0) {
          if (soundOn) beep();
        }

        if (prev <= 0) {
          if (soundOn) startSound();

          setIsResetting(true);

          setTimeout(() => {
            setIsResetting(false);
          }, 50);

          setQuestion((q) => q + 1);

          return startTime;
        }

        const next = prev - 1;

        if (next <= 0) {
          return 0;
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [running, soundOn, startTime]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "sans-serif",
        backgroundColor: time <= 5 ? "#2a0000" : "black",
        color: "white",
        padding: "20px",
        boxSizing: "border-box",
        transition: "0.3s",
      }}
    >
      <h1>問題 {question}</h1>

      <select
        value={startTime}
        disabled={running}
        onChange={(e) => {
          const newTime = Number(e.target.value);
          setStartTime(newTime);
          setTime(newTime);
        }}
        style={{
          fontSize: "20px",
          padding: "10px",
          marginBottom: "20px",
          borderRadius: "10px",
          opacity: running ? 0.5 : 1,
        }}
      >
        <option value={15}>15秒</option>
        <option value={30}>30秒</option>
        <option value={60}>60秒</option>
        <option value={90}>90秒</option>
      </select>

      <div
  style={{
    position: "relative",
    width: "320px",
    height: "320px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: "30px",
  }}
>
  <svg
    width="320"
    height="320"
    viewBox="0 0 320 320"
    style={{
      position: "absolute",
      transform: "rotate(90deg) scaleX(-1)",
      overflow: "visible",
    }}
  >
    <circle
      cx="160"
      cy="160"
      r="130"
      stroke="#333"
      strokeWidth="15"
      fill="none"
    />

    <circle
      cx="160"
      cy="160"
      r="130"
      stroke={time <= 5 ? "red" : "lime"}
      strokeWidth="15"
      fill="none"
      strokeDasharray={2 * Math.PI * 130}
      strokeDashoffset={
        time === startTime
          ? 0
          : time === 0
          ? 0
          : (1 - (time - 1) / startTime) * (2 * Math.PI * 130)
      }
      strokeLinecap="round"
      style={{
        transition: isResetting ? "none" : "stroke-dashoffset 0.95s linear",
      }}
    />
  </svg>

  <div
    style={{
      fontSize: "70px",
      fontWeight: "bold",
      color: time <= 5 ? "red" : "white",
      zIndex: 1,
    }}
  >
    {`00:${String(time).padStart(2, "0")}`}
  </div>
</div>

      <button
        onClick={() => setSoundOn((v) => !v)}
        style={{
          fontSize: "18px",
          padding: "8px 16px",
          marginBottom: "20px",
          backgroundColor: soundOn ? "#22c55e" : "#555",
          color: "white",
          border: "none",
          borderRadius: "10px",
          cursor: "pointer",
        }}
      >
        {soundOn ? "SOUND ON" : "SOUND OFF"}
      </button>

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
            if (soundOn) startSound();
            setRunning(true);
          }}
          style={{
            fontSize: "24px",
            padding: "10px 30px",
            backgroundColor: "#22c55e",
            color: "white",
            border: "none",
            borderRadius: "12px",
            cursor: "pointer",
            opacity: running ? 0.5 : 1,
            transition: "0.1s",
            transform: running ? "scale(0.95)" : "scale(1)",
          }}
        >
          START
        </button>

        <button
  onMouseDown={() => setPressedButton("stop")}
  onMouseUp={() => setPressedButton("")}
  onMouseLeave={() => setPressedButton("")}
  onTouchStart={() => setPressedButton("stop")}
  onTouchEnd={() => setPressedButton("")}
  onClick={() => setRunning(false)}
  style={{
    fontSize: "24px",
    padding: "10px 30px",
    backgroundColor: "#ef4444",
    color: "white",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "0.1s",
    transform: pressedButton === "stop" ? "scale(0.95)" : "scale(1)",
  }}
>
  STOP
</button>

        <button
  onMouseDown={() => setPressedButton("reset")}
  onMouseUp={() => setPressedButton("")}
  onMouseLeave={() => setPressedButton("")}
  onTouchStart={() => setPressedButton("reset")}
  onTouchEnd={() => setPressedButton("")}
  onClick={() => {
    setRunning(false);
    setTime(startTime);
    setQuestion(1);
  }}
  style={{
    fontSize: "24px",
    padding: "10px 30px",
    backgroundColor: "#666",
    color: "white",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "0.1s",
    transform: pressedButton === "reset" ? "scale(0.95)" : "scale(1)",
  }}
>
  RESET
</button>
      </div>
    </div>
  );
}

export default App;