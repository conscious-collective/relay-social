import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { authRouter } from './routes/auth';
import { accountsRouter } from './routes/accounts';
import { postsRouter } from './routes/posts';
import { webhooksRouter } from './routes/webhooks';
import { billingRouter } from './routes/billing';
import { analyticsRouter } from './routes/analytics';
import { openapiRouter } from './routes/openapi';
import { schedulerRouter } from './routes/scheduler';
import { oauthRouter } from './routes/oauth';
import { verifyToken } from './utils/auth';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  META_APP_ID: string;
  META_APP_SECRET: string;
  DODO_PAYMENTS_API_KEY: string;
  DODO_PRO_PRODUCT_ID: string;
  NEXT_PUBLIC_APP_URL: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use('*', cors());
app.use('*', logger());

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes
app.route('/api/auth', authRouter);
app.route('/api/oauth', oauthRouter);
app.route('/api/accounts', accountsRouter);
app.route('/api/posts', postsRouter);
app.route('/api/webhooks', webhooksRouter);
app.route('/api/billing', billingRouter);
app.route('/api/analytics', analyticsRouter);
app.route('/api/openapi', openapiRouter);

// Scheduler - called by Cloudflare Cron every minute
app.post('/api/cron/scheduler', async (c) => {
  const db = c.env.DB;
  const now = Date.now();

  // Get scheduled posts that are due
  const posts = await db.prepare(`
    SELECT p.*, a.access_token as account_access_token, a.platform_id 
    FROM posts p 
    JOIN accounts a ON p.account_id = a.id 
    WHERE p.status = 'scheduled' 
    AND p.scheduled_at <= ?
  `).bind(now).all<any>();

  if (posts.length === 0) {
    return c.json({ processed: 0 });
  }

  const results = [];
  
  for (const post of posts) {
    try {
      await db.prepare('UPDATE posts SET status = ?, updated_at = ? WHERE id = ?')
        .bind('publishing', now, post.id);

      const mediaRes = await fetch(`https://graph.facebook.com/v21.0/${post.platform_id}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_token: post.account_access_token,
          image_url: post.media_urls ? JSON.parse(post.media_urls)[0] : 'https://via.placeholder.com/1080x1080',
          caption: post.content,
        }),
      });

      const media = await mediaRes.json();

      if (media.id) {
        const publishRes = await fetch(`https://graph.facebook.com/v21.0/${post.platform_id}/media_publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token: post.account_access_token,
            creation_id: media.id,
          }),
        });

        const published = await publishRes.json();

        if (published.id) {
          await db.prepare(`
            UPDATE posts SET status = ?, platform_post_id = ?, published_at = ?, updated_at = ? WHERE id = ?
          `).bind('published', published.id, now, now, post.id);

          results.push({ id: post.id, status: 'published' });
        } else {
          throw new Error(media.error?.message || 'Failed');
        }
      } else {
        throw new Error(media.error?.message || 'Failed');
      }
    } catch (e: any) {
      await db.prepare(`
        UPDATE posts SET status = ?, error_message = ?, updated_at = ? WHERE id = ?
      `).bind('failed', e.message, now, post.id);

      results.push({ id: post.id, status: 'failed', error: e.message });
    }
  }

  return c.json({ processed: posts.length, results });
});

// Reference redirect
app.get('/api/reference', (c) => {
  return c.redirect('/api/openapi');
});

// Serve calendar (requires auth)
app.get('/calendar', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return c.html(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Login Required - Relay Social</title>
        <style>
          body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f5f5f5; }
          .card { background: white; padding: 40px; border-radius: 12px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          h1 { color: #333; margin-bottom: 16px; }
          p { color: #666; margin-bottom: 24px; }
          input { padding: 12px; border: 1px solid #ddd; border-radius: 6px; width: 300px; margin-bottom: 16px; }
          button { padding: 12px 24px; background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer; }
          button:hover { background: #4338ca; }
          .error { color: #ef4444; margin-bottom: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🔐 Login Required</h1>
          <p>Please enter your API token to access the calendar</p>
          <div class="error" id="error" style="display:none"></div>
          <input type="password" id="token" placeholder="Paste your API token" />
          <br>
          <button onclick="login()">Access Calendar</button>
          <script>
            function login() {
              const token = document.getElementById('token').value;
              if (!token) return;
              localStorage.setItem('relay_token', token);
              window.location.href = '/calendar';
            }
            document.getElementById('token').addEventListener('keypress', e => {
              if (e.key === 'Enter') login();
            });
          </script>
        </div>
      </body>
      </html>
    `);
  }

  try {
    await verifyToken(token, c.env.JWT_SECRET);
  } catch {
    return c.html(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invalid Token - Relay Social</title>
        <style>
          body { font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f5f5f5; }
          .card { background: white; padding: 40px; border-radius: 12px; text-align: center; }
          h1 { color: #ef4444; }
          button { padding: 12px 24px; background: #4f46e5; color: white; border: none; border-radius: 6px; cursor: pointer; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>❌ Invalid Token</h1>
          <p>Please log in again</p>
          <button onclick="localStorage.removeItem('relay_token'); window.location.href='/calendar'">Try Again</button>
        </div>
      </body>
      </html>
    `);
  }
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Content Calendar - Relay Social</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
    .header { background: white; padding: 20px; border-bottom: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center; }
    .header h1 { font-size: 24px; color: #333; }
    .btn { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; }
    .btn-primary { background: #4f46e5; color: white; }
    .btn-secondary { background: #e5e7eb; color: #374151; }
    .btn.active { background: #4f46e5; color: white; }
    .calendar-container { max-width: 1200px; margin: 20px auto; padding: 20px; }
    .calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .calendar-header h2 { font-size: 20px; color: #333; }
    .nav-btns { display: flex; gap: 10px; }
    .nav-btn { padding: 8px 16px; border: 1px solid #d1d5db; background: white; border-radius: 6px; cursor: pointer; }
    .monthly-view { display: none; }
    .monthly-view.active { display: block; }
    .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: #e5e7eb; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
    .day-header { background: #f9fafb; padding: 12px; text-align: center; font-weight: 600; font-size: 12px; color: #6b7280; text-transform: uppercase; }
    .day-cell { background: white; min-height: 100px; padding: 8px; cursor: pointer; }
    .day-cell:hover { background: #f9fafb; }
    .day-number { font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 8px; }
    .day-cell.today { background: #fef3c7; }
    .day-cell.other-month { background: #f9fafb; }
    .day-cell.other-month .day-number { color: #9ca3af; }
    .post-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin: 2px; }
    .post-dot.draft { background: #6b7280; }
    .post-dot.scheduled { background: #3b82f6; }
    .post-dot.published { background: #10b981; }
    .post-dot.failed { background: #ef4444; }
    .post-count { font-size: 11px; color: #6b7280; margin-top: 8px; }
    .daily-view { display: none; }
    .daily-view.active { display: block; }
    .day-header-info { margin-bottom: 20px; }
    .day-header-info h2 { font-size: 24px; margin-bottom: 8px; }
    .day-header-info .date { color: #6b7280; }
    .post-list { display: flex; flex-direction: column; gap: 12px; }
    .post-card { background: white; border-radius: 8px; padding: 16px; border: 1px solid #e5e7eb; cursor: pointer; }
    .post-card:hover { border-color: #4f46e5; }
    .post-card .time { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
    .post-card .content { font-size: 14px; color: #374151; margin-bottom: 8px; }
    .post-card .status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
    .post-card .status.draft { background: #f3f4f6; color: #6b7280; }
    .post-card .status.scheduled { background: #dbeafe; color: #2563eb; }
    .post-card .status.published { background: #d1fae5; color: #059669; }
    .post-card .status.failed { background: #fee2e2; color: #dc2626; }
    .modal { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); align-items: center; justify-content: center; }
    .modal.active { display: flex; }
    .modal-content { background: white; border-radius: 12px; padding: 24px; width: 500px; max-width: 90%; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .modal-header h3 { font-size: 18px; }
    .close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-size: 14px; font-weight: 500; margin-bottom: 6px; color: #374151; }
    .form-group input, .form-group textarea, .form-group select { width: 100%; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; }
    .form-group textarea { min-height: 100px; }
    .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
    .loading { text-align: center; padding: 40px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header">
    <h1>📅 Content Calendar</h1>
    <div class="views">
      <button class="btn btn-secondary active" id="monthlyBtn" onclick="switchView('monthly')">Monthly</button>
      <button class="btn btn-secondary" id="dailyBtn" onclick="switchView('daily')">Daily</button>
    </div>
  </div>
  <div class="calendar-container">
    <div class="monthly-view active" id="monthlyView">
      <div class="calendar-header">
        <h2 id="monthYear">January 2026</h2>
        <div class="nav-btns">
          <button class="nav-btn" onclick="changeMonth(-1)">← Prev</button>
          <button class="nav-btn" onclick="changeMonth(1)">Next →</button>
        </div>
      </div>
      <div class="calendar-grid" id="calendarGrid"></div>
    </div>
    <div class="daily-view" id="dailyView">
      <div class="day-header-info">
        <h2 id="selectedDate">January 1, 2026</h2>
        <p class="date" id="dateSubtitle"></p>
      </div>
      <div class="post-list" id="dayPosts"></div>
    </div>
  </div>
  <script>
    const API_URL = '/api';
    let currentMonth = new Date().getMonth();
    let currentYear = new Date().getFullYear();
    let posts = [];
    let selectedDate = new Date();
    let currentView = 'monthly';
    let token = localStorage.getItem('relay_token');
    if (!token) {
      token = prompt('Enter your API token:');
      if (token) localStorage.setItem('relay_token', token);
    }
    const headers = { 'Authorization': \`Bearer \${token}\`, 'Content-Type': 'application/json' };
    
    async function fetchPosts() {
      try {
        const res = await fetch(\`\${API_URL}/posts\`, { headers });
        const data = await res.json();
        posts = data.posts?.results || [];
        renderCalendar();
        renderDailyView();
      } catch (e) { console.error('Failed:', e); }
    }
    
    function renderCalendar() {
      const grid = document.getElementById('calendarGrid');
      const monthYear = document.getElementById('monthYear');
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      monthYear.textContent = \`\${months[currentMonth]} \${currentYear}\`;
      const firstDay = new Date(currentYear, currentMonth, 1).getDay();
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();
      const today = new Date();
      let html = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => \`<div class="day-header">\${d}</div>\`).join('');
      for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        html += \`<div class="day-cell other-month"><div class="day-number">\${day}</div></div>\`;
      }
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        const dateStr = date.toISOString().split('T')[0];
        const dayPosts = posts.filter(p => p.scheduled_at && new Date(p.scheduled_at).toISOString().split('T')[0] === dateStr);
        const isToday = today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear;
        const dots = dayPosts.map(p => \`<span class="post-dot \${p.status}"></span>\`).join('');
        html += \`<div class="day-cell \${isToday ? 'today' : ''}" onclick="selectDate(\${currentYear}, \${currentMonth}, \${day})">
          <div class="day-number">\${day}</div>\${dots}\${dayPosts.length ? \`<div class="post-count">\${dayPosts.length} post\${dayPosts.length > 1 ? 's' : ''}</div>\` : ''}</div>\`;
      }
      const remaining = 42 - (firstDay + daysInMonth);
      for (let day = 1; day <= remaining; day++) {
        html += \`<div class="day-cell other-month"><div class="day-number">\${day}</div></div>\`;
      }
      grid.innerHTML = html;
    }
    
    function renderDailyView() {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const dayPosts = posts.filter(p => p.scheduled_at && new Date(p.scheduled_at).toISOString().split('T')[0] === dateStr);
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      document.getElementById('selectedDate').textContent = \`\${months[selectedDate.getMonth()]} \${selectedDate.getDate()}, \${selectedDate.getFullYear()}\`;
      document.getElementById('dateSubtitle').textContent = \`\${dayPosts.length} post\${dayPosts.length !== 1 ? 's' : ''} scheduled\`;
      const list = document.getElementById('dayPosts');
      list.innerHTML = dayPosts.length ? dayPosts.map(post => {
        const time = post.scheduled_at ? new Date(post.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
        return \`<div class="post-card"><div class="time">\${time}</div><div class="content">\${post.content || 'No content'}</div><span class="status \${post.status}">\${post.status}</span></div>\`;
      }).join('') : '<p class="loading">No posts scheduled for this day.</p>';
    }
    
    function changeMonth(delta) {
      currentMonth += delta;
      if (currentMonth > 11) { currentMonth = 0; currentYear++; }
      if (currentMonth < 0) { currentMonth = 11; currentYear--; }
      renderCalendar();
    }
    
    function selectDate(year, month, day) {
      selectedDate = new Date(year, month, day);
      switchView('daily');
    }
    
    function switchView(view) {
      currentView = view;
      document.getElementById('monthlyBtn').className = \`btn btn-secondary \${view === 'monthly' ? 'active' : ''}\`;
      document.getElementById('dailyBtn').className = \`btn btn-secondary \${view === 'daily' ? 'active' : ''}\`;
      document.getElementById('monthlyView').className = \`monthly-view \${view === 'monthly' ? 'active' : ''}\`;
      document.getElementById('dailyView').className = \`daily-view \${view === 'daily' ? 'active' : ''}\`;
      if (view === 'daily') renderDailyView();
    }
    
    fetchPosts();
  </script>
</body>
</html>
  `);
});

export default app;
