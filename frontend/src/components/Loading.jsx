import React from "react";
import "./Loading.css";

const Loading = () => {
  return (
    <div className="movie-loader">

      {/* Background glow */}
      <div className="red-glow"></div>

      <div className="loader-content">

        {/* Main scene */}
        <div className="loader-scene">

          {/* Red Moon */}
          <div className="red-moon"></div>

          {/* Energy rings */}
          <div className="energy-ring ring-one"></div>
          <div className="energy-ring ring-two"></div>

          {/* Warrior */}
          <svg
            className="warrior"
            viewBox="0 0 150 230"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Head */}
            <circle cx="75" cy="38" r="18" />

            {/* Hair */}
            <path d="
              M58 35
              Q45 10 65 5
              Q75 -2 86 7
              Q105 10 94 40
              L90 25
              Q75 15 58 35
            " />

            {/* Body */}
            <path d="
              M58 58
              L92 58
              L108 125
              L95 155
              L55 155
              L42 125
              Z
            " />

            {/* Cape */}
            <path d="
              M55 65
              Q25 85 10 155
              Q35 145 60 135
              L72 80
              Z
            " />

            <path d="
              M95 65
              Q125 85 140 155
              Q115 145 90 135
              L78 80
              Z
            " />

            {/* Left arm */}
            <path d="
              M52 70
              L38 110
              L48 116
              L66 82
              Z
            " />

            {/* Right arm */}
            <path d="
              M98 70
              L112 108
              L103 114
              L86 82
              Z
            " />

            {/* Legs */}
            <path d="
              M57 145
              L72 145
              L68 205
              L50 205
              Z
            " />

            <path d="
              M78 145
              L93 145
              L102 205
              L84 205
              Z
            " />

            {/* Sword */}
            <path
              d="M105 105 L145 55 L148 58 L112 115 Z"
              fill="#050505"
            />

            {/* Sword handle */}
            <path
              d="M102 110 L112 115 L106 122 L96 116 Z"
              fill="#111"
            />
          </svg>

          {/* Ground */}
          <div className="ground-glow"></div>

          {/* Particles */}
          <span className="particle particle-1"></span>
          <span className="particle particle-2"></span>
          <span className="particle particle-3"></span>
          <span className="particle particle-4"></span>
          <span className="particle particle-5"></span>
          <span className="particle particle-6"></span>

        </div>

        {/* Loading text */}
        <div className="loading-text">
          LOADING<span className="dots">...</span>
        </div>

        {/* Progress bar */}
        <div className="progress-container">
          <div className="progress-bar"></div>
        </div>

      </div>
    </div>
  );
};

export default Loading;