---
title: "Frequently Asked Questions"
subtitle: ""
# meta description
description: "Frequently asked questions about Blue Ridge Boost classes, camps, and programs in Charlottesville, VA."
draft: false
layout: "single"

---

<div class="faq-page">

<div class="camp-quick-facts">
  <div class="camp-fact"><strong>Classes</strong><span>Ages 6+</span></div>
  <div class="camp-fact"><strong>Camps</strong><span>Year-round</span></div>
  <div class="camp-fact"><strong>Location</strong><span>2171 Ivy Rd</span></div>
  <div class="camp-fact"><strong>Contact</strong><span>(434) 260-0636</span></div>
</div>

<h2>Classes and Programs</h2>

<details class="faq-item" open>
<summary>How does a monthly subscription work?</summary>
<div class="faq-answer">
You will be charged a fixed monthly fee from September to November. Makeup sessions will be provided for any classes that fall on holidays. After the three-month period, you'll receive a 10% discount on all non-subscription products purchased.
</div>
</details>

<details class="faq-item">
<summary>What ages do you serve?</summary>
<div class="faq-answer">
Our programs are designed for children ages 6 and up. We have different tracks for elementary, middle school, and high school students, each tailored to their developmental level and interests.
</div>
</details>

<details class="faq-item">
<summary>What subjects do you teach?</summary>
<div class="faq-answer">
We offer classes in robotics, coding, game design, Minecraft, chess, and more. Our curriculum covers everything from beginner-friendly block coding to advanced programming languages.
</div>
</details>

<details class="faq-item">
<summary>Do you offer makeup classes for missed sessions?</summary>
<div class="faq-answer">
Yes, makeup sessions are provided for classes that fall on holidays. For other absences, please contact us to discuss options.
</div>
</details>

<h2>Enrollment and Payment</h2>

<details class="faq-item">
<summary>How do I enroll my child?</summary>
<div class="faq-answer">
You can enroll directly through our website by selecting the class or camp you're interested in and completing the registration process. Payment is due at the time of registration.
</div>
</details>

<details class="faq-item">
<summary>What payment methods do you accept?</summary>
<div class="faq-answer">
We accept credit cards (Visa, Mastercard, American Express, Discover), debit cards, electronic funds transfer (EFT), and checks.
</div>
</details>

<details class="faq-item">
<summary>Do you offer financial assistance?</summary>
<div class="faq-answer">
Yes! We offer scholarships through the Aicha Amira Wade, Marieme Imane Wade, and Omar Wade Memorial Scholarships. Visit our <a href="/scholarships">scholarships page</a> to learn more and apply.
</div>
</details>

<h2>Policies</h2>

<details class="faq-item">
<summary>What is your refund policy?</summary>
<div class="faq-answer">
We maintain a no-refund policy for all sales. However, transfers to similar activities may be available. Please see our <a href="/refund-policy">refund policy</a> for complete details.
</div>
</details>

<details class="faq-item">
<summary>What are the attendance limits?</summary>
<div class="faq-answer">
Each child may attend a maximum of 25 days of classes within any three-month period. This is to maintain our exemption from day care licensure and ensure equal access for all students.
</div>
</details>

<div class="camp-help-banner">
  <div class="camp-help-content">
    <h4>Still Have Questions?</h4>
    <p>We're here to help!</p>
    <p>Email {{< email >}} or call <a href="tel:+14342600636">(434) 260-0636</a></p>
  </div>
</div>

</div>

<style>
:root {
  --camp-bg: #ffffff;
  --camp-border: #e7edf5;
  --camp-navy: #0b1f3f;
  --camp-muted: #52647d;
  --camp-blue: #1463df;
}

.faq-page {
  max-width: 800px;
  margin: 0 auto;
}

.camp-quick-facts {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  margin-bottom: 2rem;
  background: var(--camp-border);
  border: 1px solid var(--camp-border);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(11, 31, 63, 0.08);
}

.camp-fact {
  padding: 1.25rem 1rem;
  text-align: center;
  background: var(--camp-bg);
}

.camp-fact strong {
  display: block;
  color: var(--camp-navy);
  font-size: 1.05rem;
  font-weight: 800;
}

.camp-fact span {
  display: block;
  margin-top: 0.25rem;
  color: var(--camp-muted);
  font-size: 0.85rem;
}

.faq-page h2 {
  margin-top: 2rem;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--camp-blue);
  color: var(--camp-navy);
  font-size: 1.35rem;
}

.faq-item {
  margin-bottom: 0.75rem;
  background: var(--camp-bg);
  border: 1px solid var(--camp-border);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(11, 31, 63, 0.04);
}

.faq-item summary {
  padding: 1rem 1.25rem;
  cursor: pointer;
  font-weight: 700;
  color: var(--camp-navy);
  list-style: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: background 0.2s ease;
}

.faq-item summary::-webkit-details-marker {
  display: none;
}

.faq-item summary::after {
  content: "+";
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--camp-blue);
  transition: transform 0.2s ease;
}

.faq-item[open] summary::after {
  content: "-";
}

.faq-item summary:hover {
  background: #f8fafc;
}

.faq-answer {
  padding: 0 1.25rem 1.25rem;
  color: var(--camp-muted);
  line-height: 1.7;
}

.faq-answer a {
  color: var(--camp-blue);
  font-weight: 600;
}

.camp-help-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2.5rem;
  padding: 1.5rem 2rem;
  background: linear-gradient(135deg, #0b1f3f, #1a3a5c);
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 8px 24px rgba(11, 31, 63, 0.15);
}

.camp-help-content h4 {
  margin: 0 0 0.5rem;
  color: #ffffff;
  font-size: 1.25rem;
}

.camp-help-content p {
  margin: 0.25rem 0;
  color: rgba(255, 255, 255, 0.85);
}

.camp-help-content a {
  color: #5fa8ff;
  font-weight: 600;
}

@media (max-width: 600px) {
  .camp-quick-facts {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .camp-help-banner {
    flex-direction: column;
    padding: 1.25rem;
  }
}
</style>
