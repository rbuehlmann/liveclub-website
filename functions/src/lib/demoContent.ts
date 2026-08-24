// Fixed pool for the "LiveDemo" club's automated Team-Info posts (see
// scheduled/demoClubTick.ts, 2026-08-23 decision) — a permanent, always-on
// demo club for App-Store-review/test-customer demos, not real content. A
// random entry is picked on every tick rather than generated on the fly —
// simple, free, and there's no benefit to an LLM call for throwaway text.
export const DEMO_POSTS: { title: string; text: string }[] = [
  { title: "Trainingslager überstanden", text: "Alle Spieler haben die Fitnesstests bestanden — sogar der Torwart, der behauptet hat, Laufen sei „nicht sein Job“." },
  { title: "Neuer Rekord", text: "Unser Captain hat gestern im Training den Ball 3x in Folge über die Latte geschossen. Ein echter Meilenstein." },
  { title: "Wetterupdate", text: "Es regnet. Wir spielen trotzdem. Bringt Regenschirme mit, aber bitte nicht auf dem Platz aufspannen." },
  { title: "Maskottchen gesucht", text: "Wir suchen ein neues Vereinsmaskottchen. Bewerbungen bitte NICHT als Fax, wir haben seit 2019 keins mehr." },
  { title: "Kabinen-Update", text: "Die neue Kaffeemaschine in der Kabine ist da. Die Nachfrage nach Nachspielzeit ist seither spürbar gestiegen." },
  { title: "Taktik-Ecke", text: "Unser Trainer hat ein neues System eingeführt: 4-4-2. Oder war es 4-2-4? Wir arbeiten noch dran." },
  { title: "Fan-Frage der Woche", text: "„Warum trägt Nr. 7 immer zwei verschiedene Stutzen?“ — Wir haben auch keine Ahnung, aber es bringt Glück." },
  { title: "Geburtstagsgrüsse", text: "Herzliche Gratulation an unseren Torhüter, der heute Geburtstag hat und trotzdem zum Training gekommen ist." },
  { title: "Ballwechsel", text: "Der Trainingsball Nr. 3 wurde offiziell in Rente geschickt. Er diente dem Verein treu — und ziemlich platt." },
  { title: "Motivationsspruch", text: "„Nach dem Spiel ist vor dem Spiel“, sagt unser Trainer. Wir sagen: nach dem Spiel ist erstmal Duschen." },
  { title: "Zuschauerrekord", text: "Beim letzten Training waren sage und schreibe zwei Hunde und eine Katze am Spielfeldrand. Support wird gerne angenommen." },
  { title: "Trikotwäsche", text: "Erinnerung an alle: bitte die Trikots VOR dem nächsten Spiel abgeben, nicht danach. Wir hatten da letztes Mal ein Duft-Problem." },
  { title: "Technikcheck", text: "Die Eckfahnen wurden erneuert. Die alten haben mehr schlecht als recht im Wind gestanden — jetzt stehen sie leicht besser." },
  { title: "Kantinen-News", text: "Ab sofort gibt es nach dem Spiel wieder Kuchen. Der Aufwärtstrend in der Stimmung ist bereits messbar." },
  { title: "Schuhwerk", text: "Ein Spieler hat versehentlich Fussballschuhe mit Stollen fürs Hallentraining mitgebracht. Der Hallenboden hat's überlebt." },
  { title: "Vereinsleben", text: "Die Vereinsversammlung dauerte gestern 2 Stunden länger als geplant. Thema: welche Farbe die neuen Bänke bekommen." },
  { title: "Warm-up-Musik", text: "Die Playlist fürs Aufwärmen wurde erneuert. Manche sagen, das hätte schon vor 5 Jahren passieren sollen." },
  { title: "Kleine Randnotiz", text: "Der Rasenmäher ist wieder repariert. Der Platzwart erklärt das offiziell zum „Sieg des Tages“." },
  { title: "Nachwuchsförderung", text: "Die U9 hat heute ihr erstes eigenes Turnier gespielt. Ergebnis: alle haben gewonnen, laut eigener Aussage." },
  { title: "Standardsituation", text: "Unser Freistoss-Spezialist übt neuerdings mit verbundenen Augen. Die Erfolgsquote bleibt vorerst unverändert." },
  { title: "Sponsoren-Dank", text: "Danke an unseren neuen Sponsor für die Bälle! Sie sind bunter als erwartet, aber runder geht kaum." },
  { title: "Statistik der Woche", text: "Anzahl verlorener Trainingsbälle diese Woche: 4. Anzahl davon im Nachbargarten gelandet: leider auch 4." },
  { title: "Feierabendrunde", text: "Nach dem Training gab's die klassische Manöverkritik am Vereinsheim-Tisch — bei einem Getränk, versteht sich." },
  { title: "Wettervorhersage", text: "Für das Wochenende ist Sonnenschein angesagt. Die Vorfreude auf trockene Trikots ist gross." },
  { title: "Materialwart-Update", text: "Die Hütchen für das Konditionstraining wurden aufgestockt. Ausreden für „das Hütchen war schon weg“ gelten ab sofort nicht mehr." },
];
