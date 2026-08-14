import Link from "next/link";

export default function NotFound() {
  return (
    <section className="not-found">
      <p className="eyebrow">404 / Not found</p>
      <h1>That calculation<br />is not on the desk.</h1>
      <p>The page may have moved, or the calculator key may be incorrect.</p>
      <Link className="primary-action" href="/">Return home</Link>
    </section>
  );
}
