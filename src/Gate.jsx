import React, { useState } from "react";

const PASSWORD = "servefast";
const KEY = "sf_unlocked";

export default function Gate({ children }) {
  const [ok, setOk] = useState(() => {
    try {
      return localStorage.getItem(KEY) === "1";
    } catch {
      return false;
    }
  });
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);

  if (ok) return children;

  function submit(e) {
    e.preventDefault();
    if (value === PASSWORD) {
      try {
        localStorage.setItem(KEY, "1");
      } catch {}
      setOk(true);
    } else {
      setWrong(true);
      setValue("");
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{ backgroundColor: "#FBF5E9" }}>
      <form onSubmit={submit}>
        <input
          type="password"
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setWrong(false);
          }}
          className="w-56 px-3 py-2 text-sm rounded-md border-2 bg-white outline-none"
          style={{ borderColor: wrong ? "#DC2626" : "#0C9499" }}
        />
      </form>
    </div>
  );
}
