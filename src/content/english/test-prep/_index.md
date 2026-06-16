---
title: "AP Test Prep | Blue Ridge Boost"
page_title: "AP Test Prep"
description: "Expert AP test preparation in Charlottesville, VA. One-on-one and small-group tutoring for AP Physics, AP Calculus AB/BC, AP Computer Science, and AP Precalculus at Blue Ridge Boost."
draft: false
layout: "tutoring"

keywords:
  - AP test prep Charlottesville
  - AP exam tutoring
  - AP Physics tutoring
  - AP Calculus AB tutoring
  - AP Calculus BC tutoring
  - AP Computer Science tutoring
  - AP Precalculus tutoring
  - AP exam preparation Virginia
  - Blue Ridge Boost test prep
  - one-on-one AP tutoring
  - small group AP prep
  - high school AP tutoring
  - AP exam coaching
  - STEM test prep Charlottesville
  - AP score improvement
robots: "index, follow"
---

<!-- Description / overview block -->
<div class="rates-header">
  <p>
    For help with AP, ACT, or SAT exams, our expert teachers provide personalized review tailored to
    each student's target score and exam timeline. Sessions include diagnostic assessments,
    full-length practice tests, and targeted review of high-yield topics — building both
    conceptual understanding and exam-day strategy.
  </p>
</div>

<div class="tiers" role="list">
  <div class="tier" role="listitem">
    <h3>Book with an Experienced Teacher</h3>
    <span class="price">$125 <small>/ hour</small></span>
  </div>
</div>

<!-- Booking section -->
<section>
  <div id="ap-form" class="form-embed" aria-label="AP Test Prep Inquiry Form">
    <iframe
      id="JotFormIFrame-261265600057047"
      title="AP Test Prep Inquiry"
      onload="window.parent.scrollTo(0,0)"
      allowtransparency="true"
      allow="geolocation; microphone; camera; fullscreen; payment"
      src="https://form.jotform.com/261265600057047"
      frameborder="0"
      style="min-width:100%;max-width:100%;border:none;"
      scrolling="no"
    ></iframe>
  </div>
  <hr>
  <script src="https://cdn.jotfor.ms/s/umd/latest/for-form-embed-handler.js"></script>
  <script>
    window.jotformEmbedHandler("iframe[id='JotFormIFrame-261265600057047']", "https://form.jotform.com/");
  </script>
</section>

<h3>About Our AP Sessions</h3>
<p>AP sessions take place virtually or in person at our Charlottesville office (2171 Ivy Road). Our tutors include experienced teachers and qualified University of Virginia students with strong AP backgrounds in their subject areas. We focus on building deep conceptual understanding alongside exam-specific strategyies like free-response technique, multiple-choice pacing, and targeted review.</p>

<script>
  // get the actual form elements
  let noraSchedule = document.getElementById("schedule-nora")
  let lainSchedule = document.getElementById("schedule-lain")
  let apForm = document.getElementById("ap-form")

  // get the button elements
  let noraButton = document.getElementById("nora-button")
  let lainButton = document.getElementById("lain-button")
  let apFormButton = document.getElementById("ap-form-button")

  noraSchedule.hidden = true
  lainSchedule.hidden = true
  apForm.hidden = false

  // make a set of the buttons
  const buttons = new Set([noraButton, lainButton, apFormButton])

  // map from button elems to schedule elems
  const buttonToSchedule = new Map([
    [noraButton, noraSchedule],
    [lainButton, lainSchedule],
    [apFormButton, apForm],
  ])

  function activate(button) {
    button.classList.add("tutoring-selected");
    buttonToSchedule.get(button).hidden = false

    buttons.difference(new Set([button])).forEach((b) => {
      b.classList.remove("tutoring-selected");
      buttonToSchedule.get(b).hidden = true
    })
  }

  buttons.forEach((button) => {
    button.onclick = (() => activate(button))
  })
</script>