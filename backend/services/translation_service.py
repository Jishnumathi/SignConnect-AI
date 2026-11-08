import logging

logger = logging.getLogger("translation_service")

try:
    from deep_translator import GoogleTranslator
    TRANSLATOR_AVAILABLE = True
except ImportError:
    TRANSLATOR_AVAILABLE = False
    logger.warning("deep-translator not available, using offline mapping only.")


OFFLINE_DICTIONARY = {
    "hello": {
        "te": "హలో (Hello)",
        "hi": "नमस्ते (Namaste)",
        "ta": "வணக்கம் (Vanakkam)",
        "ml": "നമസ്കാരം (Namaskaram)",
        "ur": "ہیلو (Hello)",
        "kn": "ನಮಸ್ಕಾರ (Namaskara)",
        "bn": "হ্যালো (Hello)",
        "en": "Hello"
    },
    "thank you": {
        "te": "ధన్యవాదాలు (Dhanyavadalu)",
        "hi": "धन्यवाद (Dhanyavaad)",
        "ta": "நன்றி (Nandri)",
        "ml": "நന്ദി (Nandi)",
        "ur": "شکریہ (Shukriya)",
        "kn": "ಧನ್ಯವಾದಗಳು (Dhanyavadagalu)",
        "bn": "ধন্যবাদ (Dhanyabad)",
        "en": "Thank you"
    },
    "yes": {
        "te": "అవును (Avunu)",
        "hi": "हाँ (Haan)",
        "ta": "ஆம் (Aam)",
        "ml": "അതെ (Athe)",
        "ur": "ہاں (Haan)",
        "kn": "ಹೌದು (Haudu)",
        "bn": "হ্যাঁ (Hya)",
        "en": "Yes"
    },
    "no": {
        "te": "వద్దు (Vaddu)",
        "hi": "नहीं (Nahi)",
        "ta": "இல்லை (Illai)",
        "ml": "ഇല്ല (Illa)",
        "ur": "نہیں (Nahi)",
        "kn": "ಇಲ್ಲ (Illa)",
        "bn": "నా (Na)",
        "en": "No"
    },
    "help": {
        "te": "సహాయం (Sahayam)",
        "hi": "मदद (Madad)",
        "ta": "உதவி (Udhavi)",
        "ml": "സഹായം (Sahayam)",
        "ur": "مدد (Madad)",
        "kn": "ಸಹಾಯ (Sahaya)",
        "bn": "সাহায্য (Sahajjo)",
        "en": "Help"
    },
    "emergency": {
        "te": "అత్యవసర పరిస్థితి (Athyavasara Paristhithi)",
        "hi": "आपातकाल (Aapaatkaal)",
        "ta": "அவசரகாலம் (Avasarakaalam)",
        "ml": "അടിയന്തിരാവസ്ഥ (Adiyanthiravastha)",
        "ur": "ہنگامی صورتحال (Hangami Soorathal)",
        "kn": "ತುರ್ತು ಪರಿಸ್ಥಿತಿ (Thurtu Paristhithi)",
        "bn": "জরুরী অবস্থা (Joruri Obostha)",
        "en": "Emergency"
    },
    "i need water": {
        "te": "నాకు నీరు కావాలి (Naku neeru kavali)",
        "hi": "मुझे पानी चाहिए (Mujhe paani chahiye)",
        "ta": "எனக்கு தண்ணீர் வேண்டும் (Enakku thanneer vendum)",
        "ml": "എനിക്ക് വെള്ളം വേണം (Enikku vellam venam)",
        "ur": "مجھے پانی چاہئے (Mujhe paani chahiye)",
        "kn": "ನನಗೆ ನೀರು ಬೇಕು (Nanage neeru beku)",
        "bn": "আমার জল দরকার (Amar jol dorkar)",
        "en": "I need water"
    },
    "water": {
        "te": "నీరు (Neeru)",
        "hi": "पानी (Paani)",
        "ta": "தண்ணீர் (Thanneer)",
        "ml": "വെള്ളം (Vellam)",
        "ur": "پانی (Paani)",
        "kn": "ನೀರು (Neeru)",
        "bn": "জল (Jol)",
        "en": "Water"
    },
    "please": {
        "te": "దయచేసి (Dayachesi)",
        "hi": "कृपया (Kripya)",
        "ta": "தயவுசெய்து (Thayavuseithu)",
        "ml": "ദയവായി (Dayavayi)",
        "ur": "براہ کرم (Barahe karam)",
        "kn": "ದಯವಿಟ್ಟು (Dayavittu)",
        "bn": "অনুগ্রহ করে (Onugroho kore)",
        "en": "Please"
    }
}

ALPHABET_PHONETICS = {
    "a": {"te": "ఏ", "hi": "ए", "ta": "ஏ", "ml": "എ", "ur": "اے", "kn": "ಎ", "bn": "এ", "en": "A"},
    "b": {"te": "బి", "hi": "बी", "ta": "பி", "ml": "ബി", "ur": "بی", "kn": "ಬಿ", "bn": "বি", "en": "B"},
    "c": {"te": "సి", "hi": "सी", "ta": "సి", "ml": "സി", "ur": "سی", "kn": "ಸಿ", "bn": "ಸಿ", "en": "C"},
    "d": {"te": "డి", "hi": "डी", "ta": "டி", "ml": "ഡി", "ur": "ڈی", "kn": "ಡಿ", "bn": "ডি", "en": "D"},
    "e": {"te": "ఈ", "hi": "ई", "ta": "ஈ", "ml": "ഇ", "ur": "ای", "kn": "ಈ", "bn": "ই", "en": "E"}
}

class TranslationService:
    @classmethod
    def _translate_offline(cls, text: str, target_lang: str) -> str:
        clean_text = text.strip().lower()
        if not clean_text:
            return text

        # 1. Exact match in offline dictionary
        if clean_text in OFFLINE_DICTIONARY and target_lang in OFFLINE_DICTIONARY[clean_text]:
            return OFFLINE_DICTIONARY[clean_text][target_lang]

        # 2. Single letter phonetics
        if len(clean_text) == 1 and clean_text in ALPHABET_PHONETICS and target_lang in ALPHABET_PHONETICS[clean_text]:
            return ALPHABET_PHONETICS[clean_text][target_lang]

        # 3. Multi-word phrase or token translation
        words = clean_text.split()
        if len(words) > 1:
            translated_parts = []
            i = 0
            while i < len(words):
                matched = False
                for phrase_len in (3, 2, 1):
                    if i + phrase_len <= len(words):
                        subphrase = " ".join(words[i:i + phrase_len])
                        if subphrase in OFFLINE_DICTIONARY and target_lang in OFFLINE_DICTIONARY[subphrase]:
                            translated_parts.append(OFFLINE_DICTIONARY[subphrase][target_lang])
                            i += phrase_len
                            matched = True
                            break
                        elif phrase_len == 1 and subphrase in ALPHABET_PHONETICS and target_lang in ALPHABET_PHONETICS[subphrase]:
                            translated_parts.append(ALPHABET_PHONETICS[subphrase][target_lang])
                            i += 1
                            matched = True
                            break
                if not matched:
                    translated_parts.append(words[i])
                    i += 1
            return " ".join(translated_parts)

        # 4. Fallback substring matching
        for key, values in OFFLINE_DICTIONARY.items():
            if key in clean_text and target_lang in values:
                return values[target_lang]

        return text

    @staticmethod
    def translate_text(text: str, target_lang: str) -> str:
        """
        Translates text into target_lang code.
        Supports online deep-translator and local static dictionaries.
        """
        if not text or not target_lang or target_lang == "en":
            return text

        clean_text = text.strip().lower()

        # Check direct offline dictionary entries first
        if clean_text in OFFLINE_DICTIONARY and target_lang in OFFLINE_DICTIONARY[clean_text]:
            return OFFLINE_DICTIONARY[clean_text][target_lang]

        # Check single letter phonetics
        if len(clean_text) == 1 and clean_text in ALPHABET_PHONETICS and target_lang in ALPHABET_PHONETICS[clean_text]:
            return ALPHABET_PHONETICS[clean_text][target_lang]

        # Online Translation
        if TRANSLATOR_AVAILABLE:
            try:
                translated = GoogleTranslator(source='en', target=target_lang).translate(text)
                if translated:
                    return translated
            except Exception as e:
                logger.warning(f"Online translation failed: {e}. Fallback to offline maps.")

        # Robust offline fallback
        return TranslationService._translate_offline(text, target_lang)
