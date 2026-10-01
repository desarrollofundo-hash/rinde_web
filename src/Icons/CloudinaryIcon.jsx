const CloudinaryIcon = ({ size = 40, className = "", ...props }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 168"
      preserveAspectRatio="xMidYMid"
      className={`cloudinary-icon ${className}`}
      {...props}
    >
      {/* Nube */}
      <path
        className="cloudinary-cloud"
        fill="#3448C5"
        d="M126.686-.002c37.04.27 69.71 24.323 80.964 59.614C235.16 63.202 255.8 86.54 256 114.28c0 22.895-14.319 41.921-37.438 49.842l-.86.289-1.06.339v-17.092c14.695-6.192 23.326-18.428 23.326-33.378-.075-21.097-16.782-38.323-37.78-39.126l-.709-.02h-6.361l-1.527-6.066c-7.494-30.93-35.08-52.79-66.905-53.015-26.187-.125-50.1 14.755-61.576 38.23l-2.36 4.861-4.454.467c-20.112 2.151-36.627 16.862-41.08 36.593-4.39 19.449 3.898 39.527 20.646 50.231l.734.46v18.025h-.106l-1.59-.721C11.744 152.636-2.99 126.08.51 98.616 4.012 71.153 24.938 49.142 52.19 44.258 66.912 16.851 95.575-.177 126.686-.002Z"
      />

      {/* Flecha 1 */}
      <path
        className="cloudinary-arrow cloudinary-arrow-1"
        fill="#3448C5"
        d="M75.06 75.202a.7.7 0 0 1 .498.208l23.56 23.581a.7.7 0 0 1-.488 1.188h-6.022c-.39 0-.71.31-.721.7v53.015a12.724 12.724 0 0 0 3.71 8.949l3.52 3.52a.7.7 0 0 1-.487 1.187H70.85c-7.027 0-12.723-5.696-12.723-12.723v-53.948a.7.7 0 0 0-.7-.7h-5.938a.7.7 0 0 1-.509-1.188l23.581-23.58a.7.7 0 0 1 .499-.21Z"
      />

      {/* Flecha 2 */}
      <path
        className="cloudinary-arrow cloudinary-arrow-2"
        fill="#3448C5"
        d="M127.163 88.858a.7.7 0 0 1 .498.209l23.581 23.496a.7.7 0 0 1-.509 1.188h-6.022c-.39.011-.7.33-.7.72v39.423a12.724 12.724 0 0 0 3.69 8.949l3.541 3.52a.7.7 0 0 1-.509 1.187h-27.716c-7.027 0-12.724-5.696-12.724-12.723v-40.313c0-.39-.31-.71-.7-.721h-6a.7.7 0 0 1-.488-1.188l23.56-23.538a.7.7 0 0 1 .498-.209Z"
      />

      {/* Flecha 3 */}
      <path
        className="cloudinary-arrow cloudinary-arrow-3"
        fill="#3448C5"
        d="M179.277 102.368c.183 0 .36.075.487.207l23.581 23.56a.7.7 0 0 1-.487 1.209h-6.044a.7.7 0 0 0-.7.7v25.85a12.724 12.724 0 0 0 3.711 8.949l3.52 3.52a.7.7 0 0 1-.487 1.187h-27.801c-7.027 0-12.724-5.696-12.724-12.723v-26.784a.7.7 0 0 0-.7-.7h-5.937a.7.7 0 0 1-.488-1.208l23.58-23.56a.679.679 0 0 1 .489-.207Z"
      />

      <style>
        {`
          .cloudinary-icon {
            overflow: visible;
            flex-shrink: 0;
          }

          .cloudinary-arrow {
            transform-box: fill-box;
            transform-origin: center;
            animation: cloudinary-upload 1.6s ease-in-out infinite;
          }

          .cloudinary-arrow-1 {
            animation-delay: 0s;
          }

          .cloudinary-arrow-2 {
            animation-delay: 0.18s;
          }

          .cloudinary-arrow-3 {
            animation-delay: 0.36s;
          }

          .cloudinary-cloud {
            transform-box: fill-box;
            transform-origin: center;
            animation: cloudinary-cloud-float 2.2s ease-in-out infinite;
          }

          @keyframes cloudinary-upload {
            0%,
            100% {
              transform: translateY(0);
            }

            50% {
              transform: translateY(-8px);
            }
          }

          @keyframes cloudinary-cloud-float {
            0%,
            100% {
              transform: translateY(0);
            }

            50% {
              transform: translateY(2px);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .cloudinary-arrow,
            .cloudinary-cloud {
              animation: none;
            }
          }
        `}
      </style>
    </svg>
  );
};

export default CloudinaryIcon;
