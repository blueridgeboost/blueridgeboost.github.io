export function fifthFridayDescription(dateLongFormat) {
    return `
      <header>
        <h3>🎉 Fifth Friday Game Night</h3>
        <p>Featuring Minecraft Java, Minecraft Education, Fortnite, and Roblox</p>
      </header>
            
      <div style="margin-top: 1rem;">
        <p style="margin: 0 0 0.75rem;">
          We go big with four fan favorites—build and collaborate in Minecraft Java, tackle classroom‑friendly
          challenges in Minecraft Education, drop into Fortnite for Battle Royale or Zero Build, and jump into curated Roblox experiences.
          Bounce between stations at your own pace and play the way you like—solo, co‑op, or with a squad.
        </p>
        <ul style="margin: 0 0 1rem 1rem; padding: 0; list-style: disc;">
          <li>Flexible play: switch between games throughout the night</li>
          <li>Friendly, supervised environment for all experience levels</li>
          <li>Free pizza to keep the energy up</li>
        </ul>
      </div>
            
      <div style="display: grid; gap: 0.75rem; margin-top: 1rem;">
        <div style="display: grid; grid-template-columns: 24px 1fr; gap: 0.5rem; align-items: start;">
          <div aria-hidden="true">🧱</div>
          <div>
            <strong>Minecraft Java</strong>
            <p>Creative builds, survival challenges, and mini‑games with friends.</p>
          </div>
        </div>
            
        <div style="display: grid; grid-template-columns: 24px 1fr; gap: 0.5rem; align-items: start;">
          <div aria-hidden="true">🎓</div>
          <div>
            <strong>Minecraft Education</strong>
            <p>Classroom‑friendly worlds and team challenges that spark creativity.</p>
          </div>
        </div>
            
        <div style="display: grid; grid-template-columns: 24px 1fr; gap: 0.5rem; align-items: start;">
          <div aria-hidden="true">🛩️</div>
          <div>
            <strong>Fortnite</strong>
            <p>Battle Royale, Zero Build, and creator maps—chase that Victory Royale.</p>
          </div>
        </div>
            
        <div style="display: grid; grid-template-columns: 24px 1fr; gap: 0.5rem; align-items: start;">
          <div aria-hidden="true">🧩</div>
          <div>
            <strong>Roblox</strong>
            <p>Curated, age‑appropriate experiences—obbies, tycoons, racing, and more.</p>
          </div>
        </div>
      </div>
            
    <div style="display: grid; gap: 0.75rem; margin-top: 1rem;">
      <div style="display: grid; grid-template-columns: 24px 1fr; gap: 0.5rem; align-items: start;">
        <div aria-hidden="true">🍕</div>
        <div>
          <strong>🍕 We’ve got the pizza—come hungry</strong>
          <p style="margin: 0.25rem 0 0;">Fuel up while you play.</p>
        </div>
      </div>
    
      <div style="font-size: 0.95rem; color: #0f172a; line-height: 1.3;">
        <div><strong>📅 ${formatIsoDateToLong(friday.date)}</strong> · 🕠 5:30–8:30 PM</div>
        <div>📍 <strong>Blue Ridge Boost</strong>, 2171 Ivy Rd, Charlottesville, VA</div>
      </div>
    </div>
        </div>
      </div>
            
            
      <footer style="margin-top: 1rem;">
        <p style="margin: 0; font-weight: 500;">
          Bring your friends and pick your playlist—four games, one awesome night!
        </p>
      </footer>
    `;
}