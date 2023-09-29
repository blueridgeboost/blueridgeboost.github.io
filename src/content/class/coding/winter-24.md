+++
title = "Coding Classes in Charlottesville | Blue Ridge Boost"
description = "Learn block languages, Scratch, Coffee Script, Python, Java, and Rust! Build Lego&reg; robots and code with Scratch! Contact us to sign or and find out more details!"
keywords = ["Charlottesville coding tutor", "Charlottesville Python tutor", "cvillecoding", "coding", "computer science tutor", "software engineering tutor", "CS tutor", "coding teacher", "Charlottesville coding", "children coding classes", "kids coding", "kids Python", "children Python", "children coding tutor"]
aliases=["/classes/", "/hs/", "/kids/", "/adults/", "/kids"]
header = "Winter 24 Coding Classes"
+++
<!-- 
classes=[ ["<a href="/class/coding/preschool-block-coding"><b>Block Coding</b></a>", "TBD", "Pre-K to K", "TBD", "TBD", "TBD"], ["<a href="/class/coding/steam-park"><b>Science with Legos (STEAM Park)</b></a>", "TBD", "Pre-K to K", "TBD", "TBD", "TBD" ], ["<a href="/class/coding/coding-express"><b>Lego Education Coding Express</b></a>", "TBD", "Pre-K to K", "TBD", "TBD", "TBD" ], ["<a href="/class/coding/fll-discover"><b>First Lego League Discover</b></a>", "TBD", "Pre-K to K", "TBD", "TBD", "TBD" ], ["<a href="/class/coding/fll-discover"><b>First Lego League Discover</b></a>", "TBD", "Pre-K to K", "TBD", "TBD", "TBD" ]] -->

<div class="container">
    <div class="row  justify-content-center">
        <div class="col">
            <div class="vstack gap-3 px-2 pb-2 text-center">  
                <div class="px-2">
                        <b>If you are unsure that our classes are a good fit for your student please sign up for a <a href="https://trialcodingclasses.youcanbook.me/">meet-and-greet session</a> or email <a href="mailto:nora@blueridgeboost.com"><em>nora@blueridgeboost.com</em></a>.</b> <br>
                        <!-- Coding classes are NOT eligible for VDOE K-12 Acceleration Grants. Please get in touch with us for scholarships based on financial need.<br> -->
                     All coding classes are held in person at the Blue Ridge Boost office at <a href="https://www.google.com/maps/place/222+Court+Square,+Charlottesville,+VA+22902/@38.0310664,-78.4791609,17z/data=!3m1!4b1!4m5!3m4!1s0x89b38627a3559ba7:0x8f9b07d311b4dd9b!8m2!3d38.0310622!4d-78.4769669">222 Court Square, Charlottesville</a>. <br> 
                     <b>Please do not park behing the building.</b> Free 2-hour parking is available on most streets nearby and free 1-hour parking in the Market Street Parking Garage.
                </div>
            </div>
        </div>
    </div>
    <!-- <div class="row"> 
        <div class="col">
            <div class="container text-center">
                <div class="row table-header">
                    <div class = "col-sm-3">
                        Class
                    </div>
                    <div class = "col-sm-3">
                        Meeting Times
                    </div>
                    <div class = "col-sm-1">
                        Recommended Grades
                    </div>
                    <div class = "col-sm-3">
                        Cost
                    </div>
                    <div class = "col-sm-1">
                        Instructor
                    </div>
                    <div class = "col-sm-1">
                        Signup
                    </div>
                </div>
                {{ $.Scratch.Set "i" 0 }}
                {{ range .Param "classes"}}
                    {{ $.Scratch.Add "i" 1 }}
                    {{ $i := $.Scratch.Get "i" }}
                    {{ range . }}
                        {{ if modBool $i 2 }}
                            <div class="row table-dark-row">
                        {{else}}
                            <div class="row table-light-row">
                        {{end}}
                        <div class = "col-sm-3">
                            Class
                        </div>
                        <div class = "col-sm-3">
                            Meeting Times
                        </div>
                        <div class = "col-sm-1">
                            Recommended Grades
                        </div>
                        <div class = "col-sm-3">
                            Cost
                        </div>
                        <div class = "col-sm-1">
                            Instructor
                        </div>
                        <div class = "col-sm-1">
                            Signup
                        </div>
                    </div>
                    {{end}}
    <div class="feature">
      {{ if modBool $i 2 }}
        <div class="column">
          IMAGE
        </div>
        <div class="column">
          CONTENT
        </div>
      {{ else }}
        <div class="column">
          CONTENT
        </div>
        <div class="column">
          IMAGE
        </div>
      {{ end }}
    </div>
  {{ end }}

<!--
                <div class="row table-light-row">
                    <div class = "col-sm-3">
                        <a href="/class/coding/preschool-block-coding"><b>Block Coding</b></a>
                    </div>
                    <div class = "col-sm-3">
                        TBD
                    </div>
                    <div class = "col-sm-1">
                        Pre-K to K
                    </div>
                    <div class = "col-sm-3" >
                        TBD
                    </div>
                    <div class = "col-sm-2">
                        TBD
                    </div>
                </div>
                <div class="row table-dark-row">
                    <div class = "col-sm-3">
                        <a href="/class/coding/steam-park"><b>Science with Legos (STEAM Park)</b></a>
                    </div>
                    <div class = "col-sm-3">
                        TBD
                    </div>
                    <div class = "col-sm-1">
                        Pre-K to K
                    </div>
                    <div class = "col-sm-3" >
                        TBD
                    </div>
                    <div class = "col-sm-2">
                        TBD
                    </div>
                </div>
                <div class="row">
                    <div class = "col-sm-3">
                        <a href="/class/coding/coding-express"><b>Lego Education Coding Express</b></a>
                    </div>
                    <div class = "col-sm-3">
                        TBD
                    </div>
                    <div class = "col-sm-1">
                        Pre-K to K
                    </div>
                    <div class = "col-sm-3" >
                        TBD
                    </div>
                    <div class = "col-sm-2">
                        TBD
                    </div>
                </div>
                <div class="row">
                    <div class = "col-sm lightnote">
                        <a href="/class/coding/fll-discover"><b>First Lego League Discover</b></a>
                    </div>
                    <div class = "col-sm lightnote">
                        TBD
                    </div>
                    <div class = "col-sm lightnote">
                        Pre-K to First Grade
                    </div>
                    <div class = "col-sm lightnote">
                        TBD
                    </div>
                </div>
                <div class="row">
                    <div class = "col-sm lightnote">
                        <a href="/class/coding/kids-block-coding"><b>Block Coding Semester 1 (with Ransford)</b></a>
                    </div>
                    <div class = "col-sm lightnote">
                        TBD
                    </div>
                    <div class = "col-sm lightnote">
                        Pre-K to First Grade
                    </div>
                    <div class = "col-sm lightnote">
                        TBD
                    </div>
                </div>
            </div>
        </div>
    </div> 
</div>  -->


