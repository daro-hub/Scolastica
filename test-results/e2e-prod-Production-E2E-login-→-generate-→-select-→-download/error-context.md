# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e-prod.spec.ts >> Production E2E: login → generate → select → download
- Location: e2e-prod.spec.ts:9:5

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - banner [ref=e5]:
      - generic [ref=e6]:
        - generic [ref=e7]:
          - img [ref=e8]
          - heading "Scolastica" [level=1] [ref=e11]
        - button "Ricomincia" [ref=e13]:
          - img
          - text: Ricomincia
    - generic [ref=e15]:
      - button "Scegli Cosa vuoi creare" [ref=e17] [cursor=pointer]:
        - img [ref=e19]
        - generic [ref=e21]:
          - paragraph [ref=e22]: Scegli
          - paragraph [ref=e23]: Cosa vuoi creare
      - button "Carica File sorgente e template" [ref=e27] [cursor=pointer]:
        - img [ref=e29]
        - generic [ref=e31]:
          - paragraph [ref=e32]: Carica
          - paragraph [ref=e33]: File sorgente e template
      - button "3 Revisiona Scegli le varianti" [disabled] [ref=e37]:
        - generic [ref=e38]: "3"
        - generic [ref=e39]:
          - paragraph [ref=e40]: Revisiona
          - paragraph [ref=e41]: Scegli le varianti
      - button "4 Esporta Scarica il risultato" [disabled] [ref=e45]:
        - generic [ref=e46]: "4"
        - generic [ref=e47]:
          - paragraph [ref=e48]: Esporta
          - paragraph [ref=e49]: Scarica il risultato
    - main [ref=e50]:
      - generic [ref=e51]:
        - generic [ref=e52]:
          - heading "Scegli le varianti" [level=2] [ref=e53]
          - paragraph [ref=e54]: Per ogni sezione, seleziona la versione che preferisci
        - generic [ref=e55]:
          - paragraph [ref=e57]: Selezionate 0 di 12 sezioni
          - generic [ref=e58]:
            - generic [ref=e59]:
              - generic [ref=e60]: "1"
              - generic [ref=e61]:
                - heading "UNIT 1 UNIT 1" [level=3] [ref=e62]
                - paragraph [ref=e63]: Clicca sulla slide che preferisci
            - generic [ref=e64]:
              - generic [ref=e66] [cursor=pointer]:
                - button [ref=e67]:
                  - img [ref=e68]
                - img "Title Slide - Variante 1" [ref=e72]
                - generic [ref=e73]:
                  - paragraph [ref=e74]: Title Slide
                  - paragraph [ref=e75]: Classic title slide for a unit opener; large title area gives UNIT 1 strong visual weight.
              - generic [ref=e77] [cursor=pointer]:
                - button [ref=e78]:
                  - img [ref=e79]
                - img "2_Title Slide - Variante 2" [ref=e83]
                - generic [ref=e84]:
                  - paragraph [ref=e85]: 2_Title Slide
                  - paragraph [ref=e86]: Alternate title slide variant keeps the same bold unit label with a different master background treatment.
              - generic [ref=e88] [cursor=pointer]:
                - button [ref=e89]:
                  - img [ref=e90]
                - img "1_Title Slide - Variante 3" [ref=e94]
                - generic [ref=e95]:
                  - paragraph [ref=e96]: 1_Title Slide
                  - paragraph [ref=e97]: Split title slide with image panel on the right adds visual context for a unit opener.
              - generic [ref=e99] [cursor=pointer]:
                - button [ref=e100]:
                  - img [ref=e101]
                - img "Concetto chiave 01 - Variante 4" [ref=e105]
                - generic [ref=e106]:
                  - paragraph [ref=e107]: Concetto chiave 01
                  - paragraph [ref=e108]: Full-area title placeholder lets UNIT 1 dominate the slide as a dramatic chapter marker.
              - generic [ref=e110] [cursor=pointer]:
                - button [ref=e111]:
                  - img [ref=e112]
                - img "Concetto chiave 02 - Variante 5" [ref=e116]
                - generic [ref=e117]:
                  - paragraph [ref=e118]: Concetto chiave 02
                  - paragraph [ref=e119]: Second key-concept layout offers an alternative background style for the same impactful unit title.
          - generic [ref=e120]:
            - generic [ref=e121]:
              - generic [ref=e122]: "2"
              - generic [ref=e123]:
                - heading "000 Watch and listen to Zoey's vlog, take notes and answer this question. What i" [level=3] [ref=e124]
                - paragraph [ref=e125]: Clicca sulla slide che preferisci
            - generic [ref=e126]:
              - generic [ref=e128] [cursor=pointer]:
                - button [ref=e129]:
                  - img [ref=e130]
                - img "Testo + 1 Immagine - Variante 1" [ref=e134]
                - generic [ref=e135]:
                  - paragraph [ref=e136]: Testo + 1 Immagine
                  - paragraph [ref=e137]: Header + body split cleanly separates the activity instruction from the core question.
              - generic [ref=e139] [cursor=pointer]:
                - button [ref=e140]:
                  - img [ref=e141]
                - img "2_Testo + 1 Immagine - Variante 2" [ref=e145]
                - generic [ref=e146]:
                  - paragraph [ref=e147]: 2_Testo + 1 Immagine
                  - paragraph [ref=e148]: Adds a visual of a vlogger alongside the instruction text, making the activity context immediately clear.
              - generic [ref=e150] [cursor=pointer]:
                - button [ref=e151]:
                  - img [ref=e152]
                - img "1_Testo + 1 Immagine - Variante 3" [ref=e156]
                - generic [ref=e157]:
                  - paragraph [ref=e158]: 1_Testo + 1 Immagine
                  - paragraph [ref=e159]: Full-height text column paired with a full-height image gives equal weight to instruction and visual stimulus.
              - generic [ref=e161] [cursor=pointer]:
                - button [ref=e162]:
                  - img [ref=e163]
                - img "Concetto chiave 01 - Variante 4" [ref=e167]
                - generic [ref=e168]:
                  - paragraph [ref=e169]: Concetto chiave 01
                  - paragraph [ref=e170]: Isolating the key question in a large placeholder focuses student attention on the discussion prompt.
              - generic [ref=e172] [cursor=pointer]:
                - button [ref=e173]:
                  - img [ref=e174]
                - img "1_Capitolo + Immagine - Variante 5" [ref=e178]
                - generic [ref=e179]:
                  - paragraph [ref=e180]: 1_Capitolo + Immagine
                  - paragraph [ref=e181]: Two-column text layout separates the activity instruction from the question for easy reading.
          - generic [ref=e182]:
            - generic [ref=e183]:
              - generic [ref=e184]: "3"
              - generic [ref=e185]:
                - heading "VOCABULARY Match the following expressions with their correct definition. 1 AI-p" [level=3] [ref=e186]
                - paragraph [ref=e187]: Clicca sulla slide che preferisci
            - generic [ref=e188]:
              - generic [ref=e190] [cursor=pointer]:
                - button [ref=e191]:
                  - img [ref=e192]
                - img "Tabella - Variante 1" [ref=e196]
                - generic [ref=e197]:
                  - paragraph [ref=e198]: Tabella
                  - paragraph [ref=e199]: Table layout is ideal for a matching vocabulary exercise, placing terms and definitions in a structured grid.
              - generic [ref=e201] [cursor=pointer]:
                - button [ref=e202]:
                  - img [ref=e203]
                - img "1_Capitolo + Immagine - Variante 2" [ref=e207]
                - generic [ref=e208]:
                  - paragraph [ref=e209]: 1_Capitolo + Immagine
                  - paragraph [ref=e210]: Two-column layout naturally mirrors the left-terms / right-definitions structure of a matching exercise.
              - generic [ref=e212] [cursor=pointer]:
                - button [ref=e213]:
                  - img [ref=e214]
                - img "Testo + 1 Immagine - Variante 3" [ref=e218]
                - generic [ref=e219]:
                  - paragraph [ref=e220]: Testo + 1 Immagine
                  - paragraph [ref=e221]: Header introduces the task type while the body lists all vocabulary items for student reference.
              - generic [ref=e223] [cursor=pointer]:
                - button [ref=e224]:
                  - img [ref=e225]
                - img "2_Testo + 1 Immagine - Variante 4" [ref=e229]
                - generic [ref=e230]:
                  - paragraph [ref=e231]: 2_Testo + 1 Immagine
                  - paragraph [ref=e232]: Image of AI/chatbot technology contextualises the vocabulary terms visually for students.
              - generic [ref=e234] [cursor=pointer]:
                - button [ref=e235]:
                  - img [ref=e236]
                - img "Titoletto + vuoto - Variante 5" [ref=e240]
                - generic [ref=e241]:
                  - paragraph [ref=e242]: Titoletto + vuoto
                  - paragraph [ref=e243]: Minimal titoletto layout leaves maximum white space for the teacher to build the exercise interactively.
          - generic [ref=e244]:
            - generic [ref=e245]:
              - generic [ref=e246]: "4"
              - generic [ref=e247]:
                - heading "IN PAIRS Look at the pictures on your left and describe what you see." [level=3] [ref=e248]
                - paragraph [ref=e249]: Clicca sulla slide che preferisci
            - generic [ref=e250]:
              - generic [ref=e252] [cursor=pointer]:
                - button [ref=e253]:
                  - img [ref=e254]
                - img "1_Testo + 1 Immagine - Variante 1" [ref=e258]
                - generic [ref=e259]:
                  - paragraph [ref=e260]: 1_Testo + 1 Immagine
                  - paragraph [ref=e261]: Full-height image on the right gives students something concrete to describe, matching the instruction perfectly.
              - generic [ref=e263] [cursor=pointer]:
                - button [ref=e264]:
                  - img [ref=e265]
                - img "2_Testo + 1 Immagine - Variante 2" [ref=e269]
                - generic [ref=e270]:
                  - paragraph [ref=e271]: 2_Testo + 1 Immagine
                  - paragraph [ref=e272]: Splits the activity label from the instruction while showing a relevant image for description practice.
              - generic [ref=e274] [cursor=pointer]:
                - button [ref=e275]:
                  - img [ref=e276]
                - img "3 colonne Txt + Img - Variante 3" [ref=e280]
                - generic [ref=e281]:
                  - paragraph [ref=e282]: 3 colonne Txt + Img
                  - paragraph [ref=e283]: Three-column image layout gives multiple pictures for students to describe, directly supporting the pair-work activity.
              - generic [ref=e285] [cursor=pointer]:
                - button [ref=e286]:
                  - img [ref=e287]
                - img "Titoletto + Immagine - Variante 4" [ref=e291]
                - generic [ref=e292]:
                  - paragraph [ref=e293]: Titoletto + Immagine
                  - paragraph [ref=e294]: Large image dominates the slide giving students a rich visual stimulus for the description task.
              - generic [ref=e296] [cursor=pointer]:
                - button [ref=e297]:
                  - img [ref=e298]
                - img "Immagina + didascalia - Variante 5" [ref=e302]
                - generic [ref=e303]:
                  - paragraph [ref=e304]: Immagina + didascalia
                  - paragraph [ref=e305]: Image fills most of the slide with the instruction as a caption below, keeping focus on the visual.
          - generic [ref=e306]:
            - generic [ref=e307]:
              - generic [ref=e308]: "5"
              - generic [ref=e309]:
                - heading "CRITICAL THINKING IN PAIRS Answer these questions and discuss them in class." [level=3] [ref=e310]
                - paragraph [ref=e311]: Clicca sulla slide che preferisci
            - generic [ref=e312]:
              - generic [ref=e314] [cursor=pointer]:
                - button [ref=e315]:
                  - img [ref=e316]
                - img "Testo + 1 Immagine - Variante 1" [ref=e320]
                - generic [ref=e321]:
                  - paragraph [ref=e322]: Testo + 1 Immagine
                  - paragraph [ref=e323]: Header labels the skill type while the body delivers the clear instruction for the activity.
              - generic [ref=e325] [cursor=pointer]:
                - button [ref=e326]:
                  - img [ref=e327]
                - img "Concetto chiave 01 - Variante 2" [ref=e331]
                - generic [ref=e332]:
                  - paragraph [ref=e333]: Concetto chiave 01
                  - paragraph [ref=e334]: Full-area title makes the critical thinking prompt unmissable and sets the tone for discussion.
              - generic [ref=e336] [cursor=pointer]:
                - button [ref=e337]:
                  - img [ref=e338]
                - img "Concetto chiave 02 - Variante 3" [ref=e342]
                - generic [ref=e343]:
                  - paragraph [ref=e344]: Concetto chiave 02
                  - paragraph [ref=e345]: Alternative key-concept background adds visual variety while keeping the instruction prominent.
              - generic [ref=e347] [cursor=pointer]:
                - button [ref=e348]:
                  - img [ref=e349]
                - img "Titoletto + vuoto - Variante 4" [ref=e353]
                - generic [ref=e354]:
                  - paragraph [ref=e355]: Titoletto + vuoto
                  - paragraph [ref=e356]: Minimal layout focuses attention on the activity type label, leaving space for follow-up questions.
              - generic [ref=e358] [cursor=pointer]:
                - button [ref=e359]:
                  - img [ref=e360]
                - img "2_Testo + 1 Immagine - Variante 5" [ref=e364]
                - generic [ref=e365]:
                  - paragraph [ref=e366]: 2_Testo + 1 Immagine
                  - paragraph [ref=e367]: Image of students in discussion reinforces the collaborative nature of the critical thinking activity.
          - generic [ref=e368]:
            - generic [ref=e369]:
              - generic [ref=e370]: "6"
              - generic [ref=e371]:
                - heading "• Do you think the app presented in the vlog would be desirable? Why? • Imagine" [level=3] [ref=e372]
                - paragraph [ref=e373]: Clicca sulla slide che preferisci
            - generic [ref=e374]:
              - generic [ref=e376] [cursor=pointer]:
                - button [ref=e377]:
                  - img [ref=e378]
                - img "Testo + 1 Immagine - Variante 1" [ref=e382]
                - generic [ref=e383]:
                  - paragraph [ref=e384]: Testo + 1 Immagine
                  - paragraph [ref=e385]: Two-part layout separates the two discussion questions, making each one clear and distinct.
              - generic [ref=e387] [cursor=pointer]:
                - button [ref=e388]:
                  - img [ref=e389]
                - img "1_Capitolo + Immagine - Variante 2" [ref=e393]
                - generic [ref=e394]:
                  - paragraph [ref=e395]: 1_Capitolo + Immagine
                  - paragraph [ref=e396]: Side-by-side columns mirror the two contrasting questions about desirability and impact.
              - generic [ref=e398] [cursor=pointer]:
                - button [ref=e399]:
                  - img [ref=e400]
                - img "Concetto chiave 01 - Variante 3" [ref=e404]
                - generic [ref=e405]:
                  - paragraph [ref=e406]: Concetto chiave 01
                  - paragraph [ref=e407]: Spotlighting the first question in a large format drives focused class discussion before moving to the second.
              - generic [ref=e409] [cursor=pointer]:
                - button [ref=e410]:
                  - img [ref=e411]
                - img "2_Testo + 1 Immagine - Variante 4" [ref=e415]
                - generic [ref=e416]:
                  - paragraph [ref=e417]: 2_Testo + 1 Immagine
                  - paragraph [ref=e418]: Visual of AI travel technology alongside both questions grounds the abstract discussion in a concrete image.
              - generic [ref=e420] [cursor=pointer]:
                - button [ref=e421]:
                  - img [ref=e422]
                - img "1_Testo + 1 Immagine - Variante 5" [ref=e426]
                - generic [ref=e427]:
                  - paragraph [ref=e428]: 1_Testo + 1 Immagine
                  - paragraph [ref=e429]: Full-height text and image split gives both questions space while a strong visual stimulates debate.
          - generic [ref=e430]:
            - generic [ref=e431]:
              - generic [ref=e432]: "7"
              - generic [ref=e433]:
                - heading "Moving forward" [level=3] [ref=e434]
                - paragraph [ref=e435]: Clicca sulla slide che preferisci
            - generic [ref=e436]:
              - generic [ref=e438] [cursor=pointer]:
                - button [ref=e439]:
                  - img [ref=e440]
                - img "Title Slide - Variante 1" [ref=e444]
                - generic [ref=e445]:
                  - paragraph [ref=e446]: Title Slide
                  - paragraph [ref=e447]: Title slide format gives this transitional phrase strong visual prominence as a section divider.
              - generic [ref=e449] [cursor=pointer]:
                - button [ref=e450]:
                  - img [ref=e451]
                - img "Concetto chiave 01 - Variante 2" [ref=e455]
                - generic [ref=e456]:
                  - paragraph [ref=e457]: Concetto chiave 01
                  - paragraph [ref=e458]: Full-area key concept layout turns this phrase into a bold motivational statement.
              - generic [ref=e460] [cursor=pointer]:
                - button [ref=e461]:
                  - img [ref=e462]
                - img "Concetto chiave 02 - Variante 3" [ref=e466]
                - generic [ref=e467]:
                  - paragraph [ref=e468]: Concetto chiave 02
                  - paragraph [ref=e469]: Alternative key-concept background provides visual variety for the transitional slide.
              - generic [ref=e471] [cursor=pointer]:
                - button [ref=e472]:
                  - img [ref=e473]
                - img "1_Title Slide - Variante 4" [ref=e477]
                - generic [ref=e478]:
                  - paragraph [ref=e479]: 1_Title Slide
                  - paragraph [ref=e480]: Split title with image reinforces the forward-movement theme with a compelling travel visual.
              - generic [ref=e482] [cursor=pointer]:
                - button [ref=e483]:
                  - img [ref=e484]
                - img "Capitolo + Immagine - Variante 5" [ref=e488]
                - generic [ref=e489]:
                  - paragraph [ref=e490]: Capitolo + Immagine
                  - paragraph [ref=e491]: Chapter layout with large image creates an inspiring visual transition between sections.
          - generic [ref=e492]:
            - generic [ref=e493]:
              - generic [ref=e494]: "8"
              - generic [ref=e495]:
                - heading "EPISODIO 01 Click & go The world of tourism" [level=3] [ref=e496]
                - paragraph [ref=e497]: Clicca sulla slide che preferisci
            - generic [ref=e498]:
              - generic [ref=e500] [cursor=pointer]:
                - button [ref=e501]:
                  - img [ref=e502]
                - img "1_Title Slide - Variante 1" [ref=e506]
                - generic [ref=e507]:
                  - paragraph [ref=e508]: 1_Title Slide
                  - paragraph [ref=e509]: Split title slide pairs the episode title with a checklist preview and a strong tourism image.
              - generic [ref=e511] [cursor=pointer]:
                - button [ref=e512]:
                  - img [ref=e513]
                - img "Capitolo + Immagine - Variante 2" [ref=e517]
                - generic [ref=e518]:
                  - paragraph [ref=e519]: Capitolo + Immagine
                  - paragraph [ref=e520]: Chapter layout with full-height image creates a compelling episode opener with all topic checkboxes visible.
              - generic [ref=e522] [cursor=pointer]:
                - button [ref=e523]:
                  - img [ref=e524]
                - img "1_Testo + 1 Immagine - Variante 3" [ref=e528]
                - generic [ref=e529]:
                  - paragraph [ref=e530]: 1_Testo + 1 Immagine
                  - paragraph [ref=e531]: Full-height text column lists all episode topics while the image establishes the tourism theme.
              - generic [ref=e533] [cursor=pointer]:
                - button [ref=e534]:
                  - img [ref=e535]
                - img "1_Capitolo + Immagine - Variante 4" [ref=e539]
                - generic [ref=e540]:
                  - paragraph [ref=e541]: 1_Capitolo + Immagine
                  - paragraph [ref=e542]: Two-column layout separates the episode title from the topic checklist for clear navigation.
              - generic [ref=e544] [cursor=pointer]:
                - button [ref=e545]:
                  - img [ref=e546]
                - img "Title Slide - Variante 5" [ref=e550]
                - generic [ref=e551]:
                  - paragraph [ref=e552]: Title Slide
                  - paragraph [ref=e553]: Standard title slide gives the episode title maximum impact with key topics as subtitle.
          - generic [ref=e554]:
            - generic [ref=e555]:
              - generic [ref=e556]: "9"
              - generic [ref=e557]:
                - heading "ACTION CALL TO" [level=3] [ref=e558]
                - paragraph [ref=e559]: Clicca sulla slide che preferisci
            - generic [ref=e560]:
              - generic [ref=e562] [cursor=pointer]:
                - button [ref=e563]:
                  - img [ref=e564]
                - img "Concetto chiave 01 - Variante 1" [ref=e568]
                - generic [ref=e569]:
                  - paragraph [ref=e570]: Concetto chiave 01
                  - paragraph [ref=e571]: Full-area key concept layout makes CALL TO ACTION a powerful, attention-grabbing slide.
              - generic [ref=e573] [cursor=pointer]:
                - button [ref=e574]:
                  - img [ref=e575]
                - img "Concetto chiave 02 - Variante 2" [ref=e579]
                - generic [ref=e580]:
                  - paragraph [ref=e581]: Concetto chiave 02
                  - paragraph [ref=e582]: Alternative key-concept background adds energy to the call-to-action message.
              - generic [ref=e584] [cursor=pointer]:
                - button [ref=e585]:
                  - img [ref=e586]
                - img "Title Slide - Variante 3" [ref=e590]
                - generic [ref=e591]:
                  - paragraph [ref=e592]: Title Slide
                  - paragraph [ref=e593]: Title slide format gives the call-to-action phrase strong hierarchical presence.
              - generic [ref=e595] [cursor=pointer]:
                - button [ref=e596]:
                  - img [ref=e597]
                - img "1_Title Slide - Variante 4" [ref=e601]
                - generic [ref=e602]:
                  - paragraph [ref=e603]: 1_Title Slide
                  - paragraph [ref=e604]: Split title with image amplifies the call-to-action energy with a motivational visual.
              - generic [ref=e606] [cursor=pointer]:
                - button [ref=e607]:
                  - img [ref=e608]
                - img "Capitolo + Immagine - Variante 5" [ref=e612]
                - generic [ref=e613]:
                  - paragraph [ref=e614]: Capitolo + Immagine
                  - paragraph [ref=e615]: Chapter layout with large image creates an energetic call-to-action section divider.
          - generic [ref=e616]:
            - generic [ref=e617]:
              - generic [ref=e618]: "10"
              - generic [ref=e619]:
                - heading "• Vlog • Presentation • Audio • Word Atlas" [level=3] [ref=e620]
                - paragraph [ref=e621]: Clicca sulla slide che preferisci
            - generic [ref=e622]:
              - generic [ref=e624] [cursor=pointer]:
                - button [ref=e625]:
                  - img [ref=e626]
                - img "Testo + 1 Immagine - Variante 1" [ref=e630]
                - generic [ref=e631]:
                  - paragraph [ref=e632]: Testo + 1 Immagine
                  - paragraph [ref=e633]: Header shows page reference while body lists all multimedia resources clearly.
              - generic [ref=e635] [cursor=pointer]:
                - button [ref=e636]:
                  - img [ref=e637]
                - img "1_Capitolo + Immagine - Variante 2" [ref=e641]
                - generic [ref=e642]:
                  - paragraph [ref=e643]: 1_Capitolo + Immagine
                  - paragraph [ref=e644]: Two-column layout separates the resource list from the page number reference.
              - generic [ref=e646] [cursor=pointer]:
                - button [ref=e647]:
                  - img [ref=e648]
                - img "Titoletto + vuoto - Variante 3" [ref=e652]
                - generic [ref=e653]:
                  - paragraph [ref=e654]: Titoletto + vuoto
                  - paragraph [ref=e655]: Minimal layout presents the resource list cleanly without distraction.
              - generic [ref=e657] [cursor=pointer]:
                - button [ref=e658]:
                  - img [ref=e659]
                - img "2_Testo + 1 Immagine - Variante 4" [ref=e663]
                - generic [ref=e664]:
                  - paragraph [ref=e665]: 2_Testo + 1 Immagine
                  - paragraph [ref=e666]: Image of digital tools alongside the resource list makes the multimedia nature of the content visually clear.
              - generic [ref=e668] [cursor=pointer]:
                - button [ref=e669]:
                  - img [ref=e670]
                - img "3 colonne Txt + Img - Variante 5" [ref=e674]
                - generic [ref=e675]:
                  - paragraph [ref=e676]: 3 colonne Txt + Img
                  - paragraph [ref=e677]: Three-column layout gives each multimedia resource its own image and label for visual clarity.
          - generic [ref=e678]:
            - generic [ref=e679]:
              - generic [ref=e680]: "11"
              - generic [ref=e681]:
                - heading "How do you think AI could make your dream trip better? Think about it, then give" [level=3] [ref=e682]
                - paragraph [ref=e683]: Clicca sulla slide che preferisci
            - generic [ref=e684]:
              - generic [ref=e686] [cursor=pointer]:
                - button [ref=e687]:
                  - img [ref=e688]
                - img "Concetto chiave 01 - Variante 1" [ref=e692]
                - generic [ref=e693]:
                  - paragraph [ref=e694]: Concetto chiave 01
                  - paragraph [ref=e695]: Full-area key concept layout turns this reflective question into a powerful discussion prompt.
              - generic [ref=e697] [cursor=pointer]:
                - button [ref=e698]:
                  - img [ref=e699]
                - img "2_Testo + 1 Immagine - Variante 2" [ref=e703]
                - generic [ref=e704]:
                  - paragraph [ref=e705]: 2_Testo + 1 Immagine
                  - paragraph [ref=e706]: Splits the question from the instruction while a visual of AI travel technology inspires student thinking.
              - generic [ref=e708] [cursor=pointer]:
                - button [ref=e709]:
                  - img [ref=e710]
                - img "1_Testo + 1 Immagine - Variante 3" [ref=e714]
                - generic [ref=e715]:
                  - paragraph [ref=e716]: 1_Testo + 1 Immagine
                  - paragraph [ref=e717]: Full-height text and image pairing gives the reflective question space alongside an inspiring travel visual.
              - generic [ref=e719] [cursor=pointer]:
                - button [ref=e720]:
                  - img [ref=e721]
                - img "Testo + 1 Immagine - Variante 4" [ref=e725]
                - generic [ref=e726]:
                  - paragraph [ref=e727]: Testo + 1 Immagine
                  - paragraph [ref=e728]: Header poses the key question while the body provides the follow-up instruction and unit context.
              - generic [ref=e730] [cursor=pointer]:
                - button [ref=e731]:
                  - img [ref=e732]
                - img "Capitolo + Immagine - Variante 5" [ref=e736]
                - generic [ref=e737]:
                  - paragraph [ref=e738]: Capitolo + Immagine
                  - paragraph [ref=e739]: Chapter layout with large image creates an immersive reflective prompt with a compelling AI travel visual.
          - generic [ref=e740]:
            - generic [ref=e741]:
              - generic [ref=e742]: "12"
              - generic [ref=e743]:
                - heading "• Travel within a country by residents is called domestic travel. • Travel to a" [level=3] [ref=e744]
                - paragraph [ref=e745]: Clicca sulla slide che preferisci
            - generic [ref=e746]:
              - generic [ref=e748] [cursor=pointer]:
                - button [ref=e749]:
                  - img [ref=e750]
                - img "Testo + 1 Immagine - Variante 1" [ref=e754]
                - generic [ref=e755]:
                  - paragraph [ref=e756]: Testo + 1 Immagine
                  - paragraph [ref=e757]: Header introduces the first definition while the body presents the remaining two for easy comparison.
              - generic [ref=e759] [cursor=pointer]:
                - button [ref=e760]:
                  - img [ref=e761]
                - img "1_Capitolo + Immagine - Variante 2" [ref=e765]
                - generic [ref=e766]:
                  - paragraph [ref=e767]: 1_Capitolo + Immagine
                  - paragraph [ref=e768]: Two-column layout groups the three travel definitions in a balanced, easy-to-read format.
              - generic [ref=e770] [cursor=pointer]:
                - button [ref=e771]:
                  - img [ref=e772]
                - img "3 colonne Txt + Img - Variante 3" [ref=e776]
                - generic [ref=e777]:
                  - paragraph [ref=e778]: 3 colonne Txt + Img
                  - paragraph [ref=e779]: Three-column layout perfectly mirrors the three travel types, each with its own image and definition.
              - generic [ref=e781] [cursor=pointer]:
                - button [ref=e782]:
                  - img [ref=e783]
                - img "2_Testo + 1 Immagine - Variante 4" [ref=e787]
                - generic [ref=e788]:
                  - paragraph [ref=e789]: 2_Testo + 1 Immagine
                  - paragraph [ref=e790]: A world map image contextualises the three travel type definitions geographically.
              - generic [ref=e792] [cursor=pointer]:
                - button [ref=e793]:
                  - img [ref=e794]
                - img "1_Testo + 1 Immagine - Variante 5" [ref=e798]
                - generic [ref=e799]:
                  - paragraph [ref=e800]: 1_Testo + 1 Immagine
                  - paragraph [ref=e801]: Full-height text lists all three definitions clearly while the image provides a visual reference for the concepts.
        - separator [ref=e802]
        - generic [ref=e803]:
          - generic [ref=e804]:
            - button "Indietro" [ref=e805]
            - button "Cerca immagini" [ref=e806]:
              - img
              - text: Cerca immagini
          - button "Crea file finale" [disabled]:
            - text: Crea file finale
            - img
  - region "Notifications alt+T":
    - list:
      - listitem [ref=e807]:
        - img [ref=e809]
        - generic [ref=e813]: Varianti pronte! Scegli le tue preferite.
  - alert [ref=e814]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test'
  2   | import fs from 'fs'
  3   | 
  4   | const PROD_URL = 'https://scolastica-production.up.railway.app'
  5   | const PASSWORD = 'scolastica2026'
  6   | const SOURCE_PDF = '/Users/marcodarinzanco/Downloads/swisstransfer_e8bf5ed1-340d-48e7-a16c-3739d3321563 (1)/Presentazioni e Mappe PPT/Presentazione 1 - fonte.pdf'
  7   | const MASTER_PPTX = '/Users/marcodarinzanco/Downloads/swisstransfer_e8bf5ed1-340d-48e7-a16c-3739d3321563 (1)/Presentazioni e Mappe PPT/Presentazione 1 - PPT.pptx'
  8   | 
  9   | test('Production E2E: login → generate → select → download', async ({ page }) => {
  10  |   test.setTimeout(420000) // 7 min
  11  | 
  12  |   console.log('=== PRODUCTION E2E TEST ===')
  13  |   console.log(`URL: ${PROD_URL}`)
  14  | 
  15  |   // 1. Login
  16  |   console.log('\n1. Testing login...')
  17  |   await page.goto(PROD_URL, { waitUntil: 'networkidle' })
  18  |   await page.waitForTimeout(2000)
  19  | 
  20  |   await expect(page.getByPlaceholder('Password')).toBeVisible({ timeout: 10000 })
  21  |   await page.screenshot({ path: 'test-results/prod_01_login.png' })
  22  | 
  23  |   await page.getByPlaceholder('Password').fill(PASSWORD)
  24  |   await page.getByRole('button', { name: 'Accedi' }).click()
  25  |   await page.waitForTimeout(3000)
  26  | 
  27  |   // Should see the wizard now
  28  |   await expect(page.getByText('Cosa vuoi creare?')).toBeVisible({ timeout: 10000 })
  29  |   await page.screenshot({ path: 'test-results/prod_02_step1.png' })
  30  |   console.log('   Login OK, wizard visible')
  31  | 
  32  |   // 2. Select Presentations
  33  |   console.log('\n2. Selecting Presentazione...')
  34  |   await page.locator('button:has-text("Genera slide")').click()
  35  |   await page.waitForTimeout(500)
  36  | 
  37  |   const avantiBtn = page.getByRole('button', { name: /Avanti/i })
  38  |   await expect(avantiBtn).toBeEnabled({ timeout: 3000 })
  39  |   await page.screenshot({ path: 'test-results/prod_03_task_selected.png' })
  40  |   console.log('   Task selected, Avanti enabled')
  41  | 
  42  |   // 3. Navigate to Step 2
  43  |   await avantiBtn.click()
  44  |   await page.waitForTimeout(1000)
  45  |   await expect(page.getByText('Carica i tuoi file')).toBeVisible({ timeout: 5000 })
  46  |   console.log('   Step 2 visible')
  47  | 
  48  |   // 4. Upload files
  49  |   console.log('\n3. Uploading files...')
  50  |   await page.locator('#upload-source input[type="file"]').setInputFiles(SOURCE_PDF)
  51  |   await page.waitForTimeout(1000)
  52  |   await page.locator('#upload-master input[type="file"]').setInputFiles(MASTER_PPTX)
  53  |   await page.waitForTimeout(1000)
  54  | 
  55  |   await page.screenshot({ path: 'test-results/prod_04_files_uploaded.png' })
  56  |   console.log('   Files uploaded')
  57  | 
  58  |   // 5. Generate
  59  |   console.log('\n4. Generating variants (2-4 min with Bedrock + LibreOffice)...')
  60  |   const genBtn = page.getByRole('button', { name: /Genera contenuti/i })
  61  |   await expect(genBtn).toBeEnabled({ timeout: 3000 })
  62  |   await genBtn.click()
  63  | 
  64  |   await page.waitForTimeout(2000)
  65  |   await page.screenshot({ path: 'test-results/prod_05_generating.png' })
  66  | 
  67  |   // 6. Wait for thumbnails
  68  |   console.log('   Waiting for slide thumbnails...')
  69  |   await expect(page.locator('img[alt*="Variante"]').first()).toBeVisible({ timeout: 360000 })
  70  |   await page.screenshot({ path: 'test-results/prod_06_thumbnails.png', fullPage: true })
  71  |   
  72  |   const imgCount = await page.locator('img[alt*="Variante"]').count()
  73  |   console.log(`   ${imgCount} thumbnail images visible!`)
  74  | 
  75  |   // 7. Verify images loaded
  76  |   const firstImg = page.locator('img[alt*="Variante"]').first()
  77  |   const naturalWidth = await firstImg.evaluate((el: HTMLImageElement) => el.naturalWidth)
  78  |   console.log(`   First image naturalWidth: ${naturalWidth}px`)
> 79  |   expect(naturalWidth).toBeGreaterThan(0)
      |                        ^ Error: expect(received).toBeGreaterThan(expected)
  80  | 
  81  |   // 8. Select variants
  82  |   console.log('\n5. Selecting variants...')
  83  |   const sectionGroups = page.locator('.space-y-10 > .relative')
  84  |   const groupCount = await sectionGroups.count()
  85  |   console.log(`   Found ${groupCount} sections`)
  86  | 
  87  |   for (let i = 0; i < groupCount; i++) {
  88  |     const firstCard = sectionGroups.nth(i).locator('[class*="cursor-pointer"]').first()
  89  |     if (await firstCard.isVisible()) {
  90  |       await firstCard.click()
  91  |       await page.waitForTimeout(200)
  92  |     }
  93  |   }
  94  | 
  95  |   await page.screenshot({ path: 'test-results/prod_07_all_selected.png', fullPage: true })
  96  | 
  97  |   const badge = page.getByText('Tutte selezionate')
  98  |   const badgeVisible = await badge.isVisible().catch(() => false)
  99  |   console.log(`   "Tutte selezionate" badge: ${badgeVisible ? 'YES' : 'no'}`)
  100 | 
  101 |   console.log('\n=== PRODUCTION E2E TEST PASSED ===')
  102 | })
  103 | 
```