// Built-in demo pages with intentional accessibility defects.
// These let users explore the platform instantly and see real axe-core findings.

export interface DemoPage {
  id: string;
  name: string;
  description: string;
  html: string;
}

export const DEMO_PAGES: DemoPage[] = [
  {
    id: 'ecommerce-home',
    name: 'E-commerce Homepage',
    description: 'Online store homepage with multiple accessibility defects: missing alt text, color contrast, form labels, and ARIA issues.',
    html: `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>TechMart — Home</title>
<style>
body { font-family: sans-serif; margin: 0; }
header { background: #1a1a2e; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; }
.logo { color: #fff; font-size: 22px; font-weight: bold; }
nav a { color: #aaa; text-decoration: none; margin-left: 20px; }
.hero { padding: 48px 24px; text-align: center; background: #f0f0f0; }
.hero h1 { font-size: 32px; color: #333; }
.hero p { color: #999; font-size: 16px; }
.btn { background: #ccc; color: #ddd; border: none; padding: 10px 24px; cursor: pointer; border-radius: 4px; }
.products { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; padding: 24px; }
.product { border: 1px solid #ddd; padding: 16px; border-radius: 8px; }
.product img { width: 100%; height: 160px; object-fit: cover; }
.price { color: #aaa; font-size: 20px; font-weight: bold; }
.search { display: flex; gap: 8px; padding: 16px 24px; }
.search input { flex: 1; padding: 8px; border: 1px solid #ccc; }
footer { background: #1a1a2e; color: #777; padding: 24px; text-align: center; }
</style>
</head>
<body>
<header>
  <div class="logo">TechMart</div>
  <nav>
    <a href="#home">Home</a>
    <a href="#deals">Deals</a>
    <a href="#cart">Cart</a>
    <a href="#account">Account</a>
  </nav>
</header>
<section class="hero">
  <h1>Welcome to TechMart</h1>
  <p>Your one-stop shop for electronics and gadgets</p>
  <button class="btn" onclick="alert('clicked')">Shop Now</button>
</section>
<div class="search">
  <input type="text" placeholder="Search products...">
  <button class="btn">Search</button>
</div>
<div class="products">
  <div class="product">
    <img src="/placeholder.jpg">
    <h3>Wireless Headphones</h3>
    <p class="price">$79.99</p>
    <button class="btn" onclick="addToCart(1)">Add to Cart</button>
  </div>
  <div class="product">
    <img src="/placeholder2.jpg">
    <h3>Smart Watch</h3>
    <p class="price">$199.99</p>
    <button class="btn" onclick="addToCart(2)">Add to Cart</button>
  </div>
  <div class="product">
    <img src="/placeholder3.jpg">
    <h3>Bluetooth Speaker</h3>
    <p class="price">$49.99</p>
    <button class="btn" onclick="addToCart(3)">Add to Cart</button>
  </div>
</div>
<footer>
  <p>&copy; 2024 TechMart. All rights reserved.</p>
</footer>
</body>
</html>`,
  },
  {
    id: 'login-form',
    name: 'Login Form',
    description: 'A login form with missing labels, poor contrast, and unlabeled buttons. Demonstrates common form accessibility failures.',
    html: `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Sign In</title>
<style>
body { font-family: sans-serif; background: #f5f5f5; margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
.card { background: #fff; padding: 40px; border-radius: 12px; width: 360px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
h1 { font-size: 24px; color: #ddd; }
label { display: none; }
input { width: 100%; padding: 10px; margin-bottom: 16px; border: 1px solid #ccc; border-radius: 4px; }
.btn { width: 100%; padding: 12px; background: #666; color: #999; border: none; border-radius: 4px; cursor: pointer; }
.link { color: #aaa; text-decoration: none; }
</style>
</head>
<body>
<div class="card">
  <h1>Sign In</h1>
  <form>
    <label for="email">Email</label>
    <input type="text" id="email" placeholder="Email">
    <label for="pass">Password</label>
    <input type="password" id="pass" placeholder="Password">
    <button type="submit" class="btn">Submit</button>
  </form>
  <p><a href="#" class="link">Forgot password?</a></p>
  <p><a href="#" class="link">Create account</a></p>
</div>
</body>
</html>`,
  },
  {
    id: 'dashboard-nav',
    name: 'Dashboard Navigation',
    description: 'Admin dashboard with improper heading hierarchy, missing ARIA on interactive widgets, and navigation issues.',
    html: `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Dashboard</title>
<style>
body { font-family: sans-serif; margin: 0; display: flex; }
.sidebar { width: 220px; background: #0f172a; min-height: 100vh; padding: 16px; }
.sidebar div { color: #64748b; padding: 12px 16px; cursor: pointer; border-radius: 6px; margin-bottom: 4px; }
.sidebar div:hover { background: #1e293b; }
.main { flex: 1; padding: 32px; }
h2 { font-size: 20px; color: #333; }
h4 { font-size: 14px; color: #94a3b8; }
.cards { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
.card { border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; }
.metric { font-size: 28px; font-weight: bold; color: #0f172a; }
table { width: 100%; border-collapse: collapse; margin-top: 24px; }
th { text-align: left; padding: 12px; background: #f1f5f9; color: #94a3b8; }
td { padding: 12px; border-bottom: 1px solid #e2e8f0; color: #cbd5e1; }
button { background: none; border: none; cursor: pointer; color: #cbd5e1; }
</style>
</head>
<body>
<aside class="sidebar">
  <h3 style="color:#94a3b8">Admin Panel</h3>
  <div onclick="nav('overview')">Overview</div>
  <div onclick="nav('users')">Users</div>
  <div onclick="nav('orders')">Orders</div>
  <div onclick="nav('reports')">Reports</div>
  <div onclick="nav('settings')">Settings</div>
</aside>
<main class="main">
  <h2>Overview</h2>
  <h4>Welcome back to your dashboard</h4>
  <div class="cards">
    <div class="card"><p>Users</p><p class="metric">1,248</p></div>
    <div class="card"><p>Revenue</p><p class="metric">$48.2k</p></div>
    <div class="card"><p>Orders</p><p class="metric">312</p></div>
  </div>
  <table>
    <thead><tr><th>ID</th><th>Customer</th><th>Status</th><th>Total</th></tr></thead>
    <tbody>
      <tr><td>#1001</td><td>Acme Corp</td><td>Pending</td><td>$1,200</td></tr>
      <tr><td>#1002</td><td>Globex Inc</td><td>Shipped</td><td>$3,450</td></tr>
    </tbody>
  </table>
  <div role="tab" onclick="showTab('all')">All</div>
  <div role="tab" onclick="showTab('active')">Active</div>
  <button onclick="exportData()">Export</button>
</main>
</body>
</html>`,
  },
  {
    id: 'media-page',
    name: 'Media & Content Page',
    description: 'Blog/media page with missing captions, empty links, skipped headings, and color-only indicator links.',
    html: `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Tech Insights Blog</title>
<style>
body { font-family: Georgia, serif; max-width: 720px; margin: 0 auto; padding: 24px; }
h1 { color: #1e293b; font-size: 28px; }
h3 { color: #334155; }
.meta { color: #94a3b8; font-size: 14px; }
article p { color: #475569; line-height: 1.6; }
.video { width: 100%; height: 320px; background: #000; display: flex; align-items: center; justify-content: center; }
.video span { color: #666; }
.tags a { color: #2563eb; margin-right: 12px; text-decoration: none; }
.status-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #22c55e; margin-right: 4px; }
.icon-link { color: #2563eb; }
</style>
</head>
<body>
<h1>The Future of Web Accessibility</h1>
<p class="meta">Published on March 15, 2024</p>
<h3>Introduction</h3>
<p>Accessibility is a critical aspect of modern web development that ensures all users can perceive, understand, navigate, and interact with websites.</p>
<div class="video"><span>Video player</span></div>
<h3>Key Principles</h3>
<p>The WCAG guidelines are organized around four principles: perceivable, operable, understandable, and robust.</p>
<h6>WCAG Levels</h6>
<p>There are three conformance levels: A, AA, and AAA.</p>
<p class="tags">
  <a href="#"><span class="status-dot"></span>Accessibility</a>
  <a href="#"><span class="status-dot" style="background:#ef4444"></span>WCAG</a>
</p>
<a href="#" class="icon-link" aria-hidden="true">🔍</a>
<a href="#" class="icon-link" aria-hidden="true">❤</a>
<div role="button" tabindex="0">Share Article</div>
</body>
</html>`,
  },
  {
    id: 'accessible-page',
    name: 'Accessible Example',
    description: 'A well-structured accessible page that passes most automated checks. Use this as a clean baseline to compare against.',
    html: `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>About Us — Accessible Co</title>
<style>
body { font-family: sans-serif; margin: 0; color: #1f2937; background: #fff; }
header { background: #1e3a5f; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; }
.logo { color: #fff; font-size: 22px; font-weight: bold; }
nav ul { list-style: none; display: flex; gap: 24px; margin: 0; padding: 0; }
nav a { color: #bfdbfe; text-decoration: none; }
nav a:hover { text-decoration: underline; }
main { max-width: 720px; margin: 0 auto; padding: 48px 24px; }
h1 { font-size: 30px; color: #1e3a5f; }
h2 { font-size: 22px; color: #1e3a5f; }
p { color: #374151; line-height: 1.6; }
img { max-width: 100%; height: auto; border-radius: 8px; }
button { background: #1e3a5f; color: #fff; border: none; padding: 10px 24px; border-radius: 4px; cursor: pointer; font-size: 16px; }
button:hover { background: #1e2f4f; }
</style>
</head>
<body>
<header>
  <div class="logo">Accessible Co</div>
  <nav aria-label="Main navigation">
    <ul>
      <li><a href="#about">About</a></li>
      <li><a href="#services">Services</a></li>
      <li><a href="#contact">Contact</a></li>
    </ul>
  </nav>
</header>
<main>
  <h1>About Us</h1>
  <p>We are a company dedicated to building accessible digital experiences for everyone.</p>
  <img src="https://picsum.photos/720/300" alt="Team meeting in a bright office space with diverse colleagues collaborating around a table">
  <h2>Our Mission</h2>
  <p>We believe the web should be accessible to everyone, regardless of ability. We follow WCAG 2.2 AA guidelines in all our projects.</p>
  <h2>Our Services</h2>
  <p>We offer accessibility audits, remediation services, and training for development teams.</p>
  <button type="button">Contact Us</button>
</main>
</body>
</html>`,
  },
];

export function getDemoPage(id: string): DemoPage | undefined {
  return DEMO_PAGES.find((p) => p.id === id);
}
