import React from "react";

const Update = (props) => {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6"
      {...props}
    >
      <g>
        <g id="spin">
          <g>
            <path
              d="M25.883,6.086l-2.82,2.832C24.953,10.809,26,13.324,26,16c0,5.516-4.484,10-10,10v-2l-4,4l4,4v-2 c7.719,0,14-6.281,14-14C30,12.254,28.539,8.734,25.883,6.086z"
            />
            <path
              d="M20,4l-4-4v2C8.281,2,2,8.281,2,16c0,3.746,1.461,7.266,4.117,9.914l2.82-2.832 C7.047,21.191,6,18.676,6,16c0-5.516,4.484-10,10-10v2L20,4z"
            />
          </g>
        </g>
      </g>
    </svg>
  );
};

export default Update;