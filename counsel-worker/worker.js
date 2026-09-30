/* ═══════════════════════════════════════════════════════════
   Kync AI 상담 서버 (Cloudflare Worker)
   - Firebase 로그인 토큰 확인 → 로그인한 사람만 사용
   - 계정별 하루 1회 제한 (한국 날짜 기준, KV에 기록)
   - Claude API 키는 여기에만 있음 (앱 코드에는 없음)

   필요한 설정 (wrangler.toml / Cloudflare 대시보드):
     ANTHROPIC_API_KEY   비밀값 (wrangler secret put ANTHROPIC_API_KEY)
     FIREBASE_PROJECT_ID kync-app-191a2
     ALLOWED_ORIGINS     https://crystalby7-lab.github.io
     MODEL               claude-haiku-4-5-20251001
     COUNSEL_LIMIT       KV 바인딩
═══════════════════════════════════════════════════════════ */

const MAX_MESSAGE = 500;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const cors = {
      'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : (allowed[0] || ''),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Vary': 'Origin',
    };
    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return json({ error: 'POST만 가능해요.' }, 405);
    if (allowed.length && !allowed.includes(origin)) return json({ error: '허용되지 않은 주소예요.' }, 403);

    // 1. 로그인 확인
    let uid;
    try {
      const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
      uid = await verifyFirebaseToken(token, env.FIREBASE_PROJECT_ID);
    } catch (e) {
      return json({ error: '로그인 정보를 확인할 수 없어요. 다시 로그인해주세요.' }, 401);
    }

    // 2. 입력 확인
    let body;
    try { body = await request.json(); } catch { return json({ error: '잘못된 요청이에요.' }, 400); }
    const message = String(body.message || '').trim();
    const role = body.role === 'parent' ? 'parent' : 'child';
    if (!message) return json({ error: '고민을 적어주세요.' }, 400);
    if (message.length > MAX_MESSAGE) return json({ error: `${MAX_MESSAGE}자 이내로 적어주세요.` }, 400);

    // 3. 하루 1회 제한
    const day = kstDate();
    const limitKey = `${uid}:${day}`;
    if (await env.COUNSEL_LIMIT.get(limitKey)) {
      return json({ error: '오늘 상담은 이미 했어요. 내일 다시 이야기해요.', limited: true }, 429);
    }
    // 동시에 두 번 누르는 것 방지용으로 먼저 표시
    await env.COUNSEL_LIMIT.put(limitKey, 'pending', { expirationTtl: 60 * 60 * 48 });

    // 4. Claude 호출
    try {
      const reply = await askClaude(env, role, message, body.context || {});
      await env.COUNSEL_LIMIT.put(limitKey, 'done', { expirationTtl: 60 * 60 * 48 });
      return json({ reply, day });
    } catch (e) {
      // 실패하면 횟수 돌려줌
      await env.COUNSEL_LIMIT.delete(limitKey);
      return json({ error: '지금은 답변을 만들 수 없어요. 잠시 후 다시 시도해주세요.' }, 502);
    }
  },
};

/* ── 한국 날짜 (YYYY-MM-DD) ── */
function kstDate() {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

/* ── 상담 지침 ── */
function systemPrompt(role, ctx) {
  const who = role === 'parent'
    ? '청소년 자녀를 둔 부모님. 자녀와의 대화, 관계, 양육 고민을 이야기합니다.'
    : '14~19세 청소년. 부모님과의 관계, 학교, 친구, 진로, 마음 고민을 이야기합니다.';
  const tone = role === 'parent' ? '존댓말' : '따뜻한 반말';

  const lines = [];
  if (ctx.quizType) lines.push(`- 본인의 대화 유형: ${ctx.quizType}${ctx.quizSub ? ` (${ctx.quizSub})` : ''}`);
  if (Array.isArray(ctx.checkins) && ctx.checkins.length) {
    lines.push(role === 'parent' ? '- 최근 자녀의 감정 체크인:' : '- 최근 본인의 감정 체크인:');
    ctx.checkins.slice(0, 7).forEach(c => {
      lines.push(`  · ${c.date}: 기분 ${c.emotion || '-'}, 스트레스 ${c.stress ?? '-'}/10, 에너지 ${c.energy ?? '-'}/10${c.memo ? `, 메모 "${String(c.memo).slice(0, 60)}"` : ''}`);
    });
  }

  return `당신은 가족 소통 앱 Kync의 상담 도우미입니다.
상담 상대: ${who}

참고 정보 (필요할 때만 자연스럽게 활용하고, 그대로 읊지 마세요):
${lines.length ? lines.join('\n') : '- 없음'}

답변 규칙:
- ${tone}로, 한국어로 답합니다.
- 하루에 한 번만 주고받는 상담입니다. 되묻기보다 이 답변 하나로 도움이 되게 씁니다.
- 먼저 마음을 알아주고, 오늘 바로 해볼 수 있는 작은 행동 1~2가지를 제안합니다.
- 상대방(부모 또는 자녀)을 탓하거나 한쪽 편만 들지 않습니다.
- 진단하거나 약·치료를 권하지 않습니다.
- 300자 안팎으로 짧게 씁니다. 목록 기호나 마크다운은 쓰지 않습니다.

위기 상황 규칙 (가장 중요):
- 자해, 자살 생각, 학대나 폭력 피해, 당장 위험한 상황이 보이면 다른 조언보다 먼저,
  혼자 견디지 말고 지금 바로 도움을 받으라고 분명하게 안내합니다.
  자살예방상담전화 109, 청소년상담전화 1388 (문자·카카오톡 상담 가능), 긴급 상황은 112 또는 119.
- 믿을 수 있는 어른에게 알리도록 권합니다.`;
}

async function askClaude(env, role, message, ctx) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: env.MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      system: systemPrompt(role, ctx),
      messages: [{ role: 'user', content: message }],
    }),
  });
  if (!res.ok) throw new Error('claude ' + res.status + ' ' + (await res.text()).slice(0, 200));
  const data = await res.json();
  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
  if (!text) throw new Error('empty reply');
  return text;
}

/* ── Firebase 로그인 토큰 확인 (구글 공개키로 서명 검증) ── */
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let _jwks = null, _jwksAt = 0;

async function getKeys() {
  if (_jwks && Date.now() - _jwksAt < 3600 * 1000) return _jwks;
  const res = await fetch(JWKS_URL);
  _jwks = (await res.json()).keys || [];
  _jwksAt = Date.now();
  return _jwks;
}

function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

async function verifyFirebaseToken(token, projectId) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('bad token');
  const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0])));
  const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1])));
  if (header.alg !== 'RS256') throw new Error('bad alg');

  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== projectId) throw new Error('bad aud');
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error('bad iss');
  if (!payload.sub || payload.exp < now || payload.iat > now + 300) throw new Error('expired');

  const jwk = (await getKeys()).find(k => k.kid === header.kid);
  if (!jwk) throw new Error('unknown key');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]),
    new TextEncoder().encode(parts[0] + '.' + parts[1]));
  if (!ok) throw new Error('bad signature');
  return payload.sub;
}
