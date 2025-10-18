
export function fortniteDescription(dateLongFormat) {
	return `
		<header style="margin: 0 0 0.5rem; font-size: 1rem; line-height: 1.2;">
		<p style="margin: 0; font-weight: 600;">Fortnite Game Night
		</p>
		</header>
		<div style="margin: 0;">
			<p style="margin: 0 0 0.5rem; font-size: 0.9rem; line-height: 1.35;">
				Squad up for an action‑packed evening in Fortnite. Jump into Battle Royale, Zero Build, or creator‑made experiences—whether you’re grinding for that Victory Royale or just here for laid‑back fun with friends. New to Fortnite or returning after a break? Instructors are ready to help you get started so you can get in‑game fast.
			</p>
			<ul style="margin: 0 0 0.5rem 1rem; padding: 0; list-style: disc; font-size: 0.9rem; line-height: 1.35;">
				<li>Play modes: Battle Royale, Zero Build, Team Rumble, and featured creator maps</li>
				<li>Casual, friendly vibe—join solo or party up</li>
				<li>All skill levels welcome</li>
			</ul>
		</div>
		<div style="display: grid; gap: 0.4rem; margin: 0.4rem 0; font-size: 0.9rem; line-height: 1.3;">
			<div style="margin: 0;">
				<strong>🍕 We’ve got the pizza—come hungry</strong>
				<span style="display: block; margin-top: 0.15rem;">Fuel up while you play.</span>
			</div>
			<div style="color: #0f172a;">
				<strong>📅 ${dateLongFormat}</strong> · 🕠 5:30–8:30 PM
			</div>
		</div>
		<div style="display: grid; grid-template-columns: 18px 1fr; gap: 0.4rem; align-items: start; font-size: 0.9rem; line-height: 1.3; margin: 0.2rem 0;">
			<div aria-hidden="true" style="line-height: 1;">📍
			</div>
			<div>
				<strong>Where</strong>
				<p style="margin: 0.15rem 0 0;">
					Blue Ridge Boost<br>
					2171 Ivy Rd, Charlottesville, VA 22903
				</p>
			</div>
		</div><footer style="margin-top: 0.5rem; font-size: 0.9rem; line-height: 1.3;">
		<p style="margin: 0; font-weight: 500;">
			Bring your squad, your best emotes, and your appetite—see you on the Battle Bus!
		</p>
		</footer>`
}