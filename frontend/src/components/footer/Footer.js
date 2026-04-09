import React from "react";
import "./css/footer.css";

const Footer = () => {
  return (
    <footer>
      <p className="larger-screen-warn">
        To access all features, view this system in a larger screen.
      </p>
      <ul>
        <li>
          <a
            href="https://github.com/Sudharshan348/Code-Runner/blob/main/README.md"
            target="_blank"
            rel="noopener noreferrer"
          >
            About
          </a>
        </li>
        <li>
          <a
            href="https://github.com/Sudharshan348/Code-Runner"
            target="_blank"
            rel="noopener noreferrer"
          >
            View Code
          </a>
        </li>
        <li>
          <a
            href="https://github.com/Sudharshan348/Code-Runner"
            target="_blank"
            rel="noopener noreferrer"
          >
            Contact
          </a>
        </li>
        <li>
          <a
            href="https://github.com/Sudharshan348/Code-Runner"
            target="_blank"
            rel="noopener noreferrer"
          >
            Contribute
          </a>
        </li>
      </ul>
      <p>
        Built by{" "}
        <a
          href="https://github.com/Sudharshan348/Code-Runner"
          target="_blank"
          rel="noopener noreferrer"
        >
          B Sudharshan.
        </a>
      </p>
    </footer>
  );
};

export default Footer;
