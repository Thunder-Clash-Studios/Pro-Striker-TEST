// ===== PRO STRIKER - menu.js (v2 — BOLD SPORTS-APP STYLE) =====
console.log('[ProStriker] menu.js v2 loaded');

const MENU_ACCENT = '#1fd15c';
const MENU_GOLD = '#ffc636';
const MENU_INK = '#0b1220';
const MENU_INK_2 = '#121b2e';

function drawKickoffBackdrop(time) {
    const sky = ctx.createLinearGradient(0, 0, 0, 600);
    sky.addColorStop(0, '#12203a');
    sky.addColorStop(0.4, '#0f2e4a');
    sky.addColorStop(1, '#0a3a2e');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 900, 600);

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(450, 40, 620, 130, 0, 0, Math.PI * 2);
    ctx.clip();
    const crowdColors = ['#1a2c4a', '#20355a', '#17253f', '#243a5e'];
    for (let i = 0; i < 40; i++) {
        ctx.fillStyle = crowdColors[i % crowdColors.length];
        ctx.fillRect((i * 24) % 900, -40 + (i % 3) * 14, 20, 12);
    }
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-50, 600);
    ctx.lineTo(950, 600);
    ctx.lineTo(760, 150);
    ctx.lineTo(140, 150);
    ctx.closePath();
    ctx.clip();

    const stripeCount = 12;
    for (let i = 0; i < stripeCount; i++) {
        const t0 = i / stripeCount, t1 = (i + 1) / stripeCount;
        ctx.fillStyle = i % 2 === 0 ? '#1fae54' : '#25c162';
        ctx.beginPath();
        ctx.moveTo(-50 + t0 * 1000, 600);
        ctx.lineTo(-50 + t1 * 1000, 600);
        ctx.lineTo(140 + t1 * 620, 150);
        ctx.lineTo(140 + t0 * 620, 150);
        ctx.closePath();
        ctx.fill();
    }

    const sweepX = ((time * 60) % 1400) - 250;
    const sheen = ctx.createLinearGradient(sweepX, 0, sweepX + 180, 0);
    sheen.addColorStop(0, 'rgba(255,255,255,0)');
    sheen.addColorStop(0.5, 'rgba(255,255,255,0.10)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 130, 900, 480);

    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(450, 150); ctx.lineTo(450, 600);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(450, 380, 90, 55, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(450, 380, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();

    const lightPositions = [[130, 60], [770, 60]];
    lightPositions.forEach(([lx, ly], i) => {
        const flicker = 0.9 + Math.sin(time * 2 + i * 2) * 0.06;
        const beam = ctx.createRadialGradient(lx, ly, 5, lx, ly, 260);
        beam.addColorStop(0, `rgba(255,250,225,${0.55 * flicker})`);
        beam.addColorStop(0.5, `rgba(255,240,180,${0.14 * flicker})`);
        beam.addColorStop(1, 'rgba(255,230,150,0)');
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.arc(lx, ly, 260, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.shadowColor = '#fff6d8';
        ctx.shadowBlur = 18;
        ctx.fillStyle = `rgba(255,252,235,${0.95 * flicker})`;
        ctx.beginPath();
        ctx.arc(lx, ly, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

function drawKickoffHeroBall(time) {
    const bx = 250, by = 330 + Math.sin(time * 1.6) * 10;
    const r = 56;

    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(bx, 395, r * 0.85, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(time * 0.9);

    if (typeof footballImgReady !== 'undefined' && footballImgReady) {
        ctx.shadowColor = 'rgba(255,255,255,0.5)';
        ctx.shadowBlur = 24;
        ctx.drawImage(FootballImg, -r, -r, r * 2, r * 2);
        ctx.restore();
    } else {
        ctx.shadowColor = 'rgba(255,255,255,0.5)';
        ctx.shadowBlur = 24;
        const ballGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
        ballGrad.addColorStop(0, '#ffffff');
        ballGrad.addColorStop(0.6, '#f2f5f7');
        ballGrad.addColorStop(1, '#c9d2da');
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = ballGrad;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = '#12202f';
        const pent = (cx, cy, s) => {
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
                const px = cx + Math.cos(a) * s, py = cy + Math.sin(a) * s;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
        };
        pent(0, 0, r * 0.28);
        for (let i = 0; i < 5; i++) {
            const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
            pent(Math.cos(a) * r * 0.58, Math.sin(a) * r * 0.58, r * 0.2);
        }
        ctx.restore();

        ctx.beginPath();
        ctx.ellipse(-r * 0.32, -r * 0.36, r * 0.26, r * 0.16, -0.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.fill();
        ctx.restore();
    }

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
        const a = Math.PI * 0.65 + i * 0.18;
        ctx.beginPath();
        ctx.arc(bx, by, r + 22 + i * 10, a, a + 0.5);
        ctx.stroke();
    }
    ctx.restore();
}

function drawKickoffTitle(time) {
    ctx.save();
    ctx.textAlign = 'left';

    ctx.fillStyle = MENU_GOLD;
    ctx.beginPath();
    ctx.roundRect(44, 34, 116, 24, 6);
    ctx.fill();
    ctx.fillStyle = MENU_INK;
    ctx.font = '800 12px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MATCHDAY', 44 + 58, 50);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 56px Impact, "Arial Narrow", sans-serif';
    ctx.fillText('PRO', 42, 118);
    ctx.fillStyle = MENU_ACCENT;
    ctx.font = '900 56px Impact, "Arial Narrow", sans-serif';
    const proW = ctx.measureText('PRO ').width;
    ctx.fillText('STRIKER', 42 + proW, 118);

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '700 13px Outfit, sans-serif';
    ctx.fillText('ARCADE FOOTBALL — FIRST WHISTLE IN 3...2...1', 44, 140);
    ctx.restore();
}

function drawKickoffCard(hoverIndex) {
    const cardX = 470, cardY = 160, cardW = 390;

    const options = [
        { key: '01', label: '1 VS 1', sub: 'LOCAL SHOWDOWN', icon: 'shirt', color: '#2fd1ff' },
        { key: '02', label: 'VS COMPUTER', sub: 'TEST YOUR LIMITS', icon: 'vsComputer', color: '#ff6b6b' },
        { key: '03', label: 'TOURNAMENT', sub: 'CHASE THE CUP', icon: 'trophy', color: MENU_GOLD },
        { key: '04', label: 'INSTRUCTIONS', sub: 'LEARN THE CONTROLS', icon: 'book', color: MENU_GOLD },
        { key: '05', label: 'STATS', sub: 'YOUR RECORD', icon: 'chart', color: MENU_ACCENT },
        { key: '06', label: 'SETTINGS', sub: 'MATCH & AUDIO', icon: 'gear', color: '#9b7bff' }
    ];

    const rowW = cardW, rowH = 58, rowGap = 8;
    const rowsStartY = cardY;

    window._menuButtons = options.map((opt, i) => ({
        x: cardX, y: rowsStartY + i * (rowH + rowGap), w: rowW, h: rowH
    }));

    options.forEach((opt, i) => {
        const isHovered = hoverIndex === i;
        const y = rowsStartY + i * (rowH + rowGap);
        const x = cardX;

        ctx.save();
        if (isHovered) {
            ctx.shadowColor = opt.color;
            ctx.shadowBlur = 22;
            ctx.shadowOffsetY = 4;
        } else {
            ctx.shadowColor = 'rgba(0,0,0,0.45)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 4;
        }

        ctx.fillStyle = isHovered ? opt.color : MENU_INK_2;
        ctx.beginPath();
        ctx.roundRect(x, y, rowW, rowH, 14);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        ctx.fillStyle = opt.color;
        ctx.beginPath();
        ctx.roundRect(x, y, 6, rowH, { tl: 14, bl: 14, tr: 0, br: 0 });
        ctx.fill();
        ctx.restore();

        const badgeCX = x + 44, badgeCY = y + rowH / 2;
        ctx.beginPath();
        ctx.fillStyle = isHovered ? 'rgba(255,255,255,0.92)' : opt.color;
        ctx.arc(badgeCX, badgeCY, 21, 0, Math.PI * 2);
        ctx.fill();
        drawIcon(ctx, opt.icon, badgeCX, badgeCY, 22, isHovered ? opt.color : MENU_INK);

        const textX = x + 78;
        ctx.textAlign = 'left';
        ctx.fillStyle = isHovered ? MENU_INK : '#ffffff';
        ctx.font = '800 18px Outfit, sans-serif';
        ctx.fillText(opt.label, textX, y + rowH / 2 - 2);
        ctx.fillStyle = isHovered ? 'rgba(11,18,32,0.7)' : 'rgba(255,255,255,0.42)';
        ctx.font = '700 10px Outfit, sans-serif';
        ctx.fillText(opt.sub, textX, y + rowH / 2 + 14);

        ctx.textAlign = 'center';
        ctx.fillStyle = isHovered ? 'rgba(11,18,32,0.15)' : 'rgba(255,255,255,0.06)';
        ctx.beginPath();
        ctx.roundRect(x + rowW - 54, y + rowH / 2 - 15, 34, 30, 8);
        ctx.fill();
        ctx.fillStyle = isHovered ? MENU_INK : 'rgba(255,255,255,0.5)';
        ctx.font = '900 15px Outfit, sans-serif';
        ctx.fillText(opt.key, x + rowW - 37, y + rowH / 2 + 5);
    });
}

function drawKickoffFooter() {
    ctx.save();
    ctx.textAlign = 'left';
    drawIcon(ctx, SoundManager.musicEnabled ? 'volumeOn' : 'mute', 60, 566, 16, 'rgba(255,255,255,0.55)');
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '700 10px Outfit, sans-serif';
    ctx.fillText(`MUSIC ${SoundManager.musicEnabled ? 'ON' : 'OFF'}   SFX ${SoundManager.sfxEnabled ? 'ON' : 'OFF'}`, 78, 570);
    ctx.textAlign = 'right';
    ctx.fillText('PRESS 1–6 OR TAP TO SELECT', 840, 570);

    ctx.fillStyle = MENU_GOLD;
    ctx.font = '700 12px Outfit, sans-serif';
    ctx.fillText('ℹ CREDITS', 840, 592);
    window._creditsBtn = { x: 770, y: 577, w: 80, h: 20 };
    ctx.restore();
}

function drawTunnelMenu(hoverIndex) {
    const time = Date.now() * 0.001;
    drawKickoffBackdrop(time);
    drawKickoffHeroBall(time);
    drawKickoffTitle(time);
    drawKickoffCard(hoverIndex);
    drawKickoffFooter();
}