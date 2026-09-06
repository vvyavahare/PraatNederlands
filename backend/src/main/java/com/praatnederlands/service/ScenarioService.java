package com.praatnederlands.service;

import com.praatnederlands.model.RoleplayScenario;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ScenarioService {

    private final Map<String, RoleplayScenario> scenarios = new ConcurrentHashMap<>();

    public ScenarioService() {
        initScenarios();
    }

    private void initScenarios() {
        var sollicitatie = new RoleplayScenario(
            "sollicitatie",
            "Sollicitatiegesprek Tech Scale-up",
            "Job Interview (Software Engineering)",
            "Work & Career",
            "B2.1",
            "Briefcase",
            "Bram de Vries",
            "Engineering Lead & Tech Manager (Amsterdam tech community)",
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
            "Bespreek je technische achtergrond, werkervaring met Java en microservices, team-standups en hoe je omgaat met agile teamuitdagingen.",
            "Je zit aan tafel met Bram voor een professioneel B2-level gesprek. Bram volgt actuele standups, datamigraties, scrum-processen en innovaties in de Nederlandse tech-scene op de voet, en bespreekt graag zowel jouw ervaring als team-inzichten uit de kennisbank.",
            "Goedemorgen! Fijn dat je er bent. Welkom bij ons op kantoor. Laten we beginnen: kun je jezelf kort voorstellen en vertellen wat je aanspreekt in deze functie?",
            List.of(
                "Professioneel verleden presenteren met de voltooid tegenwoordige tijd (perfectum)",
                "Constructief standpunt innemen met B2-connectoren (\"enerzijds... anderzijds\", \"desondanks\")",
                "Inversie correct toepassen bij zinnen die beginnen met tijd of reden"
            ),
            List.of(
                new RoleplayScenario.VocabItem("de werkervaring", "work experience"),
                new RoleplayScenario.VocabItem("onderbouwen", "to substantiate / justify"),
                new RoleplayScenario.VocabItem("de uitdaging", "challenge"),
                new RoleplayScenario.VocabItem("van mening zijn", "to be of the opinion"),
                new RoleplayScenario.VocabItem("aansluiten bij", "to align with")
            )
        );

        var gemeente = new RoleplayScenario(
            "gemeente_bsn",
            "Gemeenteloket: Inschrijving & BSN",
            "City Hall Registration & BSN",
            "Government & BSN",
            "B1.1",
            "Building2",
            "Anouk Bakker",
            "Ambtenaar Burgerzaken",
            "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
            "Regel je adreswijziging, uittreksel BRP of inschrijving bij de gemeente in formeel maar vriendelijk Nederlands.",
            "Je hebt een afspraak aan het loket van de gemeente. Je moet je paspoort en huurcontract tonen en uitleggen wanneer je bent verhuisd.",
            "Goedendag, neem gerust plaats. U komt voor de inschrijving op uw nieuwe woonadres, klopt dat? Heeft u uw identiteitsbewijs en huurcontract bij de hand?",
            List.of(
                "Formele beleefdheidsvormen (\"u\", \"zou u\", \"alstublieft\")",
                "Separable verbs (\"meenemen\", \"inleveren\", \"inschrijven\")",
                "Adres- en persoonsgegevens helder formuleren"
            ),
            List.of(
                new RoleplayScenario.VocabItem("het huurcontract", "rental contract"),
                new RoleplayScenario.VocabItem("de verhuizing", "relocation"),
                new RoleplayScenario.VocabItem("het legitimatiebewijs", "proof of identity")
            )
        );

        var huurcontract = new RoleplayScenario(
            "huurcontract",
            "Onderhandelen Huurcontract",
            "Rental Contract & Maintenance Negotiation",
            "Housing & Living",
            "B1.2",
            "Key",
            "Daan van Dijk",
            "Verhuurmakelaar",
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
            "Bespreek servicekosten, borg en opleverdatum met een Nederlandse makelaar of huisbaas.",
            "Je staat in een appartement in Utrecht of Amsterdam. Je wil onderhandelen over de ingangsdatum van het huurcontract en vragen wie verantwoordelijk is voor onderhoud.",
            "Welkom! Mooi licht appartement, hè? Je gaf aan geïnteresseerd te zijn per de eerste van volgende maand. Heb je het conceptcontract al kunnen doornemen?",
            List.of(
                "Voorwaardelijke zinnen formuleren met \"als\" en \"zou\"",
                "Zakelijke beleefdheid combineren met assertiviteit",
                "Afspraken bevestigen in de toekomende tijd (\"zullen\")"
            ),
            List.of(
                new RoleplayScenario.VocabItem("de waarborgsom", "security deposit"),
                new RoleplayScenario.VocabItem("de servicekosten", "utility/service charges"),
                new RoleplayScenario.VocabItem("het onderhoud", "maintenance")
            )
        );

        var vrijmibo = new RoleplayScenario(
            "vrijmibo",
            "Vrijdagmiddagborrel (Vrijmibo)",
            "Friday Casual Workplace Socializing",
            "Social & Culture",
            "B1.2",
            "Beer",
            "Sanne de Jong",
            "Collega Product Designer",
            "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
            "Klets informeel met collega's op kantoor: weekendplannen, hobby's, vakanties en Nederlandse cultuur.",
            "Het is vrijdag 17:00 uur. Sanne schenkt een drankje in en vraagt hoe je week was en wat je van het weekend gaat doen.",
            "Hé, gezellig dat je erbij bent! Wat een drukke sprint was het deze week, zeg. Drink je een biertje of liever fris? En heb je al leuke plannen voor het weekend?",
            List.of(
                "Informele omgangstaal en spreektaalwoorden (\"gezellig\", \"lekker\", \"zeg\")",
                "Verhalen vertellen met tijdsindicatoren",
                "Spontaan reageren op anekdotes van collega's"
            ),
            List.of(
                new RoleplayScenario.VocabItem("het weekend vieren", "to celebrate the weekend"),
                new RoleplayScenario.VocabItem("bijkomen", "to unwind / recover"),
                new RoleplayScenario.VocabItem("de borrelhapjes", "bar snacks / bitterballen")
            )
        );

        scenarios.put(sollicitatie.id(), sollicitatie);
        scenarios.put(gemeente.id(), gemeente);
        scenarios.put(huurcontract.id(), huurcontract);
        scenarios.put(vrijmibo.id(), vrijmibo);
    }

    public List<RoleplayScenario> getAllScenarios() {
        return List.copyOf(scenarios.values());
    }

    public RoleplayScenario getScenario(String id) {
        return scenarios.getOrDefault(id, scenarios.get("sollicitatie"));
    }
}
