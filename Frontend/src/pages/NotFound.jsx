import { Link } from 'react-router-dom';
import './NotFound.css';

export default function NotFound() {
  return (
    <div className="notfound-page">
      <div className="notfound-glyph">✦</div>
      <h1 className="notfound-code">404</h1>
      <p className="notfound-msg">This page seems to have wandered off.</p>
      <Link to="/" className="btn btn-primary">← Back to stories</Link>
    </div>
  );
}
