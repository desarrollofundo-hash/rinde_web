import { motion } from "framer-motion";

const AnimatedTrash = ({ className = "", isHovered = false }) => {
  const variants = {
    rest: {},
    hover: {},
  };

  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      initial="rest"
      animate={isHovered ? "hover" : "rest"}
      variants={variants}
    >
      {/* Cuerpo del tacho */}
      <motion.path
        d="M5 7L6 20C6.08 20.55 6.55 21 7.1 21H16.9C17.45 21 17.92 20.55 18 20L19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={{
          rest: {
            scale: 1,
          },
          hover: {
            scale: 1.02,
          },
        }}
      />

      {/* Líneas del tacho */}
      <path
        d="M9 11V17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <path
        d="M15 11V17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Tapa */}
      <motion.g
        style={{
          transformOrigin: "5px 7px",
        }}
        variants={{
          rest: {
            rotate: 0,
            x: 0,
            y: 0,
          },
          hover: {
            rotate: -25,
            x: -1,
            y: -1,
          },
        }}
        transition={{
          duration: 0.25,
          ease: "easeOut",
        }}
      >
        <path
          d="M4 7H20"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />

        <path
          d="M10 4H14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />

        <path
          d="M8 7L8.5 4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />

        <path
          d="M16 7L15.5 4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </motion.g>
    </motion.svg>
  );
};

export default AnimatedTrash;
