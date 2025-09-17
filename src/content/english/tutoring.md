---
title: "Tutoring"
page_title: ""
subtitle: ""
# meta description
description: "Boost your child's learning with personalized tutoring at Blue Ridge Boost in Charlottesville, VA! Offering one-on-one and small group sessions in math, coding, and robotics for all levels. Virtual and in-person options available. Enroll now!"
draft: false
layout: "tutoring"

keywords:
  - math tutoring Charlottesville
  - Blue Ridge Boost tutoring services
  - in-person math tutoring
  - online math tutoring
  - one-on-one tutoring Charlottesville
  - small group tutoring Charlottesville
  - elementary math tutoring
  - middle school math tutoring
  - high school math tutoring
  - AP mathematics tutoring
  - college math tutoring
  - homework assistance tutoring
  - problem-solving math classes
  - algebra tutoring Charlottesville
  - geometry tutoring Charlottesville
  - pre-calculus tutoring Charlottesville
  - affordable tutoring services Charlottesville
  - personalized math tutoring
  - math learning support Charlottesville
robots: "index, follow"
---

<div class="rates-header">
    <h2 id="rates-heading">STEM Tutoring</h2>
    <p>
      Our competitive rates are tailored to your child’s educational needs. Pricing varies by subject
      complexity and tutor expertise. We provide personalized attention and targeted instruction to
      ensure optimal learning outcomes.
    </p>
  </div>

  <div class="tiers" role="list">
    <div class="tier" role="listitem">
      <h3>Elementary School</h3>
      <span class="price">From $75 <small>/ hour</small></span>
    </div>
    <div class="tier" role="listitem">
      <h3>Middle & High School</h3>
      <span class="price">From $95 <small>/ hour</small></span>
    </div>
    <div class="tier" role="listitem">
      <h3>AP & College</h3>
      <span class="price">From $125 <small>/ hour</small></span>
    </div>
  </div>
</section>

<section>
  <div class="cta-grid">
    <!-- Replace the href values with your actual scheduling URLs for Nora and Lain -->
    <a class="cta-btn" id="nora-button" aria-label="Make an appointment with Nora">
      Book an appointment with Nora<br>
      Advanced Math and Computer Science
    </a>
    <a class="cta-btn secondary" id="lain-button" aria-label="Make an appointment with Lain">
      Book an appointment - any tutor
    </a>
    <a class="cta-btn neutral tutoring-selected" id="tutoring-button" aria-label="Fill in a tutoring form" onclick="document.getElementById('tutoring-form').scrollIntoView({behavior:'smooth'}); return false;">
      Send us a request
    </a>
  </div>

  <div id="schedule-nora">
  <script src="https://embed.ycb.me"	async="true"	data-domain="brb-tutoring-nora"	data-displaymode="auto"></script>
  </div>

   <div id="schedule-lain">
  <script src="https://embed.ycb.me"	async="true"	data-domain="brb-tutoring-all-tutors"	data-displaymode="auto"></script>
  </div>

  <div id="tutoring-form" class="form-embed" aria-label="Request Individual Tutoring form">
    <iframe
      id="JotFormIFrame-252545013109145"
      title="Request Individual Tutoring"
      onload="window.parent.scrollTo(0,0)"
      allowtransparency="true"
      allow="geolocation; microphone; camera; fullscreen; payment"
      src="https://form.jotform.com/252545013109145"
      frameborder="0"
      style="min-width:100%;max-width:100%;border:none;"
      scrolling="no"
    ></iframe>
  </div>
  <hr>
  <script src="https://cdn.jotfor.ms/s/umd/latest/for-form-embed-handler.js"></script>
  <script>
    window.jotformEmbedHandler("iframe[id='JotFormIFrame-252545013109145']", "https://form.jotform.com/");
  </script>
</section>

<h3>About Our Sessions</h3>
    <p>Tutoring sessions are available both virtually and in person at the Blue Ridge Boost office, located at 2171 Ivy Road, Charlottesville. Our team of experienced teachers and qualified University of Virginia students is dedicated to helping your child excel in a variety of subjects, including mathematics, physics, chemistry, reading, and writing. We focus on nurturing problem-solving abilities, critical thinking skills, and fostering a deep understanding of core concepts, rather than just memorizing facts or formulas.</p>
      <p>We provide both individual one-on-one tutoring and <strong><u><a class="" href="/classes/on-demand"> small group classes (available here)</a></u></strong>.</p>


<script>
  /*
  to add a new button/schedule you need to:
      create a new schedule reference
        let newSchedule = document.getElementById("yourScheduleId")
      create a new button reference 
        let newButton = document.getElementById("yourButtonId) 
      add them to the map
        insert [newButton, newSchedule] to the buttonToSchedule map
      you're done!
  */

  // get the actual form elements
  let noraSchedule = document.getElementById("schedule-nora")
  let lainSchedule = document.getElementById("schedule-lain")
  let tutoringSchedule = document.getElementById("tutoring-form")

  // get the button elements
  let noraButton = document.getElementById("nora-button")
  let lainButton = document.getElementById("lain-button")
  let tutoringButton = document.getElementById("tutoring-button")

  noraSchedule.hidden = true
  lainSchedule.hidden = true
  tutoringSchedule.hidden = false

  //we make a set of the buttons 
  const buttons = new Set([noraButton, lainButton, tutoringButton])
  
  // we map from button elems to schedule elems using this  
  const buttonToSchedule = new Map( [
    [noraButton, noraSchedule],
    [lainButton, lainSchedule],
    [tutoringButton, tutoringSchedule],
  ])



  //create the function that activates one button and deactivates all others
  function activate(button) {
    //activate the specific schedule and button
    button.classList.add("tutoring-selected");
    buttonToSchedule.get(button).hidden = false

    // deactivate the others
    buttons.difference(new Set([button])).forEach( (b) => {
      b.classList.remove("tutoring-selected");
      buttonToSchedule.get(b).hidden = true
    }) 
  }
  //finally add the function to each button's on click 
  buttons.forEach( (button) => {
    button.onclick = (() => activate(button))
  })
</script>