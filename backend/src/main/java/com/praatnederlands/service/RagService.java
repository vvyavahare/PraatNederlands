package com.praatnederlands.service;

import com.praatnederlands.model.DutchIdiom;
import com.praatnederlands.model.GlobalWorldTopic;
import com.praatnederlands.model.RAGSearchMatch;
import com.praatnederlands.model.RealtimeConversationRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RagService {

    private static final Logger log = LoggerFactory.getLogger(RagService.class);

    private final Map<String, RealtimeConversationRecord> conversations = new ConcurrentHashMap<>();
    private final Map<String, GlobalWorldTopic> worldTopics = new ConcurrentHashMap<>();

    public record RagContextResult(
        List<MatchedSnippet> relevantSnippets,
        List<DutchIdiom> authenticIdioms,
        List<String> globalWorldFacts,
        List<String> recentKnowledgeCatalog,
        List<RecordBrief> allRecordsBrief
    ) {
        public record MatchedSnippet(String speaker, String text, String context, String title, String recordId) {}
        public record RecordBrief(String id, String title, String summary, List<String> extractedPhrases) {}
    }

    public RagService() {
        seedInitialKnowledgeBase();
        seedInitialWorldTopics();
    }

    private void seedInitialKnowledgeBase() {
        var bookingStandup = new RealtimeConversationRecord(
            "conv_standup_booking_1",
            "IT Standup & Sprint Planning (Booking.com Amsterdam)",
            "workplace",
            List.of("scrum", "it_standup", "microservices", "workplace_b2"),
            "B2",
            List.of(
                new RealtimeConversationRecord.DialogueTurn("Lars", "Goedemorgen allemaal. Ik kan wel beginnen. Gisteren heb ik de datamigratie naar PostgreSQL afgerond. De latency op de staging cluster blijft stabiel onder de 50 milliseconden."),
                new RealtimeConversationRecord.DialogueTurn("Sanne", "Super, Lars! Lopen we dan nog tegen bottlenecks aan voor de release van aanstaande dinsdag?"),
                new RealtimeConversationRecord.DialogueTurn("Lars", "Nee, alles draait soepel. Maar ik wil vanmiddag na de lunch wel even kortsluiten met het DevOps-team over de loadbalancer-configuratie. Zullen we daarna even sparren?"),
                new RealtimeConversationRecord.DialogueTurn("Sanne", "Afgesproken! Laten we de schouders eronder zetten zodat we voor het weekend klaar zijn.")
            ),
            "Lars: Goedemorgen allemaal. Ik kan wel beginnen. Gisteren heb ik de datamigratie naar PostgreSQL afgerond. De latency op de staging cluster blijft stabiel onder de 50 milliseconden.\nSanne: Super, Lars! Lopen we dan nog tegen bottlenecks aan voor de release van aanstaande dinsdag?\nLars: Nee, alles draait soepel. Maar ik wil vanmiddag na de lunch wel even kortsluiten met het DevOps-team over de loadbalancer-configuratie. Zullen we daarna even sparren?\nSanne: Afgesproken! Laten we de schouders eronder zetten zodat we voor het weekend klaar zijn.",
            List.of(
                new DutchIdiom("even kortsluiten", "To align / quickly coordinate with someone", "workplace"),
                new DutchIdiom("sparren over", "To brainstorm or exchange perspectives with a colleague", "workplace"),
                new DutchIdiom("de schouders eronder zetten", "To pull together and work hard as a team", "informal")
            ),
            "Nederlandse Tech Bedrijfscultuur & IT Werksfeer",
            generateLexicalVector("IT Standup Sprint Planning Booking.com Amsterdam Lars Sanne PostgreSQL datamigratie latency kortsluiten sparren"),
            "preset_native",
            "Booking.com HQ, Oosterdokseiland Amsterdam",
            Instant.now().toString()
        );

        var gemeenteUtrecht = new RealtimeConversationRecord(
            "conv_gemeente_utrecht_2",
            "Inschrijving Burgerzaken & BSN Gesprek (Gemeente Utrecht)",
            "administration",
            List.of("gemeente", "bsn", "burgerzaken", "formal_b1"),
            "B1",
            List.of(
                new RealtimeConversationRecord.DialogueTurn("Baliemedewerker", "Goedemiddag, welkom bij de balie Burgerzaken. U komt voor een eerste inschrijving vanuit het buitenland, zie ik?"),
                new RealtimeConversationRecord.DialogueTurn("Expat", "Goedemiddag! Ja, dat klopt inderdaad. Ik heb hier mijn paspoort en het getekende huurcontract van mijn woning aan de Oudegracht."),
                new RealtimeConversationRecord.DialogueTurn("Baliemedewerker", "Fijn, dank u wel. Het huurcontract ziet er compleet uit. Ik ga uw gegevens nu verifiëren in de Basisregistratie Personen (BRP). Uw Burgerservicenummer ontvangt u binnen vijf werkdagen per post."),
                new RealtimeConversationRecord.DialogueTurn("Expat", "Heel hartelijk dank voor uw vriendelijke en snelle hulp!")
            ),
            "Baliemedewerker: Goedemiddag, welkom bij de balie Burgerzaken. U komt voor een eerste inschrijving vanuit het buitenland, zie ik?\nExpat: Goedemiddag! Ja, dat klopt inderdaad. Ik heb hier mijn paspoort en het getekende huurcontract van mijn woning aan de Oudegracht.\nBaliemedewerker: Fijn, dank u wel. Het huurcontract ziet er compleet uit. Ik ga uw gegevens nu verifiëren in de Basisregistratie Personen (BRP). Uw Burgerservicenummer ontvangt u binnen vijf werkdagen per post.\nExpat: Heel hartelijk dank voor uw vriendelijke en snelle hulp!",
            List.of(
                new DutchIdiom("dat klopt inderdaad", "That is indeed correct (polite affirmation)", "formal"),
                new DutchIdiom("er compleet uitzien", "To look completely in order", "formal"),
                new DutchIdiom("hartelijk dank voor uw hulp", "Thank you warmly for your assistance", "formal")
            ),
            "Gemeentelijke Dienstverlening & Expat Immigratie",
            generateLexicalVector("Inschrijving Burgerzaken BSN Gesprek Gemeente Utrecht huurcontract Oudegracht BRP paspoort"),
            "preset_native",
            "Stadskantoor Utrecht, Jaarbeursplein",
            Instant.now().toString()
        );

        conversations.put(bookingStandup.id(), bookingStandup);
        conversations.put(gemeenteUtrecht.id(), gemeenteUtrecht);
    }

    private void seedInitialWorldTopics() {
        var trains = new GlobalWorldTopic(
            "topic_ns_trains",
            "NS Treinstoringen & Spoorvernieuwing Randstad",
            "Transport",
            "Regelmatige werkzaamheden op het traject Schiphol-Amsterdam Zuid-Utrecht Centraal. Reizigers moeten rekening houden met 15-30 minuten extra reistijd.",
            "Rail maintenance across the Randstad corridor causing regular 15-30 minute travel delays.",
            true
        );

        var housing = new GlobalWorldTopic(
            "topic_housing_market",
            "Woningcrisis & Middenhuur Regulering",
            "Housing",
            "Grote krapte op de Nederlandse woningmarkt. Nieuwe wetgeving voor betaalbare middenhuur heeft geleid tot strenge puntensystemen.",
            "Tight Dutch housing market with strict point-system rental regulations.",
            true
        );

        var directness = new GlobalWorldTopic(
            "topic_dutch_directness",
            "Nederlandse Directheid op de Werkvloer",
            "Culture",
            "Nederlanders communiceren open, direct en zonder veel hiërarchie. Feedback wordt openlijk gedeeld in teamoverleggen.",
            "Dutch cultural directness and flat hierarchy in professional meetings.",
            true
        );

        worldTopics.put(trains.id(), trains);
        worldTopics.put(housing.id(), housing);
        worldTopics.put(directness.id(), directness);
    }

    /**
     * Normalized 64-dimensional lexical vector based on token and bigram hashing
     */
    public List<Double> generateLexicalVector(String text) {
        int dim = 64;
        double[] vector = new double[dim];
        if (text == null || text.isBlank()) {
            return Arrays.stream(vector).boxed().toList();
        }

        String cleaned = text.toLowerCase().replaceAll("[^a-z0-9\\s]", " ");
        String[] tokens = Arrays.stream(cleaned.split("\\s+")).filter(s -> !s.isBlank()).toArray(String[]::new);

        for (int i = 0; i < tokens.length; i++) {
            String token = tokens[i];
            int hash = token.hashCode();
            int idx = Math.abs(hash) % dim;
            vector[idx] += 1.0;

            if (i > 0) {
                String bigram = tokens[i - 1] + "_" + token;
                int biHash = bigram.hashCode();
                vector[Math.abs(biHash) % dim] += 1.5;
            }
        }

        double sumSq = 0;
        for (double v : vector) {
            sumSq += v * v;
        }
        double norm = Math.sqrt(sumSq);
        if (norm == 0) norm = 1.0;

        List<Double> result = new ArrayList<>(dim);
        for (double v : vector) {
            result.add(v / norm);
        }
        return result;
    }

    public double cosineSimilarity(List<Double> vecA, List<Double> vecB) {
        if (vecA == null || vecB == null || vecA.isEmpty() || vecB.isEmpty()) return 0.0;
        int minLen = Math.min(vecA.size(), vecB.size());
        double dot = 0.0, normA = 0.0, normB = 0.0;
        for (int i = 0; i < minLen; i++) {
            dot += vecA.get(i) * vecB.get(i);
            normA += vecA.get(i) * vecA.get(i);
            normB += vecB.get(i) * vecB.get(i);
        }
        if (normA == 0 || normB == 0) return 0.0;
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    public List<RAGSearchMatch> searchKnowledgeBase(String query, int topK, String categoryFilter) {
        if (query == null || query.isBlank()) return List.of();

        String queryLower = query.toLowerCase().trim();
        List<String> queryTokens = Arrays.stream(queryLower.replaceAll("[^a-z0-9\\s]", " ").split("\\s+"))
            .filter(w -> w.length() >= 3)
            .toList();

        List<Double> queryVec = generateLexicalVector(query);
        List<RAGSearchMatch> matches = new ArrayList<>();

        for (RealtimeConversationRecord record : conversations.values()) {
            double similarity = cosineSimilarity(queryVec, record.embedding());

            // Keyword & entity boost
            double bonus = 0.0;
            String titleLower = record.title().toLowerCase();
            String textLower = record.rawTranscript().toLowerCase();
            String locLower = (record.locationOrContext() != null ? record.locationOrContext() : "").toLowerCase();

            for (String token : queryTokens) {
                if (titleLower.contains(token)) bonus += 0.35;
                if (locLower.contains(token)) bonus += 0.25;
                if (textLower.contains(token)) bonus += 0.15;
            }

            for (var turn : record.turns()) {
                String spk = turn.speaker().toLowerCase();
                for (String token : queryTokens) {
                    if (spk.contains(token)) {
                        bonus += 0.35;
                        break;
                    }
                }
            }

            if ("live_recorded".equals(record.source())) bonus += 0.1;
            if (categoryFilter != null && !categoryFilter.equals("all") && record.category().equalsIgnoreCase(categoryFilter)) {
                bonus += 0.1;
            }

            similarity = Math.min(0.99, similarity + bonus);

            String bestTurn = record.turns().isEmpty() ? record.rawTranscript() : record.turns().get(0).text();
            String bestSpeaker = record.turns().isEmpty() ? "Spreker" : record.turns().get(0).speaker();

            for (var turn : record.turns()) {
                String turnLower = turn.text().toLowerCase();
                if (queryTokens.stream().anyMatch(turnLower::contains)) {
                    bestTurn = turn.text();
                    bestSpeaker = turn.speaker();
                    break;
                }
            }

            matches.add(new RAGSearchMatch(
                record.id(),
                record.title(),
                record.category(),
                Math.round(similarity * 100.0) / 100.0,
                bestTurn,
                bestSpeaker,
                record.extractedIdioms(),
                record.locationOrContext()
            ));
        }

        matches.sort((a, b) -> Double.compare(b.similarity(), a.similarity()));
        return matches.subList(0, Math.min(topK, matches.size()));
    }

    public RagContextResult getRagAugmentedContext(String userText, String category) {
        List<RAGSearchMatch> matches = searchKnowledgeBase(userText, 4, category);

        List<RagContextResult.MatchedSnippet> snippets = matches.stream()
            .filter(m -> m.similarity() > 0.05)
            .map(m -> new RagContextResult.MatchedSnippet(
                m.speaker(),
                m.matchedTurn(),
                m.title() + " (" + (m.locationOrContext() != null ? m.locationOrContext() : m.category()) + ")",
                m.title(),
                m.recordId()
            ))
            .toList();

        Map<String, DutchIdiom> idiomsMap = new LinkedHashMap<>();
        for (var m : matches) {
            for (var idiom : m.extractedIdioms()) {
                idiomsMap.putIfAbsent(idiom.phrase(), idiom);
            }
        }
        for (var rec : conversations.values()) {
            for (var idiom : rec.extractedIdioms()) {
                idiomsMap.putIfAbsent(idiom.phrase(), idiom);
            }
        }

        List<String> worldFacts = worldTopics.values().stream()
            .filter(GlobalWorldTopic::activeInRAG)
            .map(t -> "• [" + t.topicTitle() + "]: " + t.summaryDutch())
            .toList();

        List<String> catalog = new ArrayList<>();
        List<RagContextResult.RecordBrief> briefs = new ArrayList<>();

        for (var rec : conversations.values()) {
            String turnsPreview = rec.turns().stream().limit(3)
                .map(t -> t.speaker() + ": \"" + t.text() + "\"")
                .reduce((a, b) -> a + " | " + b)
                .orElse("");
            catalog.add("• [" + rec.title() + "] (" + rec.category() + "): " + turnsPreview);
            briefs.add(new RagContextResult.RecordBrief(
                rec.id(),
                rec.title(),
                rec.rawTranscript().substring(0, Math.min(200, rec.rawTranscript().length())),
                rec.extractedIdioms().stream().map(DutchIdiom::phrase).toList()
            ));
        }

        return new RagContextResult(
            snippets,
            new ArrayList<>(idiomsMap.values()).subList(0, Math.min(5, idiomsMap.size())),
            worldFacts,
            catalog,
            briefs
        );
    }

    public RealtimeConversationRecord addConversationRecord(RealtimeConversationRecord record) {
        String id = record.id() != null && !record.id().isBlank()
            ? record.id()
            : "conv_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 4);

        List<Double> embedding = record.embedding() != null && !record.embedding().isEmpty()
            ? record.embedding()
            : generateLexicalVector(record.title() + " " + record.category() + " " + record.rawTranscript());

        RealtimeConversationRecord stored = new RealtimeConversationRecord(
            id,
            record.title() != null ? record.title() : "Opgenomen Gesprek",
            record.category() != null ? record.category() : "workplace",
            record.tags() != null ? record.tags() : List.of("opname", "B2"),
            record.level() != null ? record.level() : "B2",
            record.turns(),
            record.rawTranscript(),
            record.extractedIdioms() != null ? record.extractedIdioms() : List.of(),
            record.worldContextTopic() != null ? record.worldContextTopic() : "Nederlands Kantoor",
            embedding,
            record.source() != null ? record.source() : "live_recorded",
            record.locationOrContext() != null ? record.locationOrContext() : "Nederland",
            Instant.now().toString()
        );

        conversations.put(id, stored);
        log.info("Saved conversation to Java 25 RAG store: {}", id);
        return stored;
    }

    public boolean deleteConversation(String id) {
        return conversations.remove(id) != null;
    }

    public List<RealtimeConversationRecord> getAllConversations() {
        List<RealtimeConversationRecord> list = new ArrayList<>(conversations.values());
        list.sort((a, b) -> b.createdAt().compareTo(a.createdAt()));
        return list;
    }

    public List<GlobalWorldTopic> getAllWorldTopics() {
        return new ArrayList<>(worldTopics.values());
    }

    public boolean toggleWorldTopic(String topicId) {
        GlobalWorldTopic topic = worldTopics.get(topicId);
        if (topic != null) {
            GlobalWorldTopic updated = new GlobalWorldTopic(
                topic.id(),
                topic.topicTitle(),
                topic.category(),
                topic.summaryDutch(),
                topic.summaryEnglish(),
                !topic.activeInRAG()
            );
            worldTopics.put(topicId, updated);
            return true;
        }
        return false;
    }
}
