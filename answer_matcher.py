import re
import unicodedata
from dataclasses import dataclass
from difflib import SequenceMatcher
from typing import Iterable, Optional, Protocol, Sequence


_WHITESPACE_RE = re.compile(r"\s+")
_SPACE_BEFORE_PUNCTUATION_RE = re.compile(r"\s+([,.;:!?])")
_MULTIPLE_APOSTROPHES_RE = re.compile(r"'+")
_QUOTE_TRANSLATION_TABLE = str.maketrans(
    {
        "\u2018": "'",
        "\u2019": "'",
        "\u201B": "'",
        "\u2032": "'",
        "\u00B4": "'",
        "\u0060": "'",
    }
)


class LanguageRules(Protocol):
    def normalize(self, text: Optional[str]) -> str:
        ...

    def build_variants(self, text: Optional[str]) -> set[str]:
        ...


@dataclass(frozen=True)
class AnswerMatchResult:
    is_correct: bool
    is_close_match: bool
    closest_answer: Optional[str] = None


@dataclass(frozen=True)
class BaseLanguageRules:
    """
    Common text normalization shared by all supported languages.
    Language-specific subclasses can extend build_variants() with additional
    equivalent forms without changing the comparison API.
    """

    def normalize(self, text: Optional[str]) -> str:
        normalized = unicodedata.normalize("NFKC", str(text or ""))
        normalized = normalized.translate(_QUOTE_TRANSLATION_TABLE)
        normalized = normalized.casefold()
        normalized = _WHITESPACE_RE.sub(" ", normalized).strip()
        normalized = _SPACE_BEFORE_PUNCTUATION_RE.sub(r"\1", normalized)
        normalized = _MULTIPLE_APOSTROPHES_RE.sub("'", normalized)
        return normalized

    def build_variants(self, text: Optional[str]) -> set[str]:
        normalized = self.normalize(text)
        if not normalized:
            return {""}
        return {normalized}


@dataclass(frozen=True)
class EnglishLanguageRules(BaseLanguageRules):
    """
    English-specific equivalence rules.
    Currently focuses on common contractions and negation forms, but the module
    is intentionally structured so new languages can plug in their own logic.
    """

    _TOKEN_EXPANSIONS = {
        "i'm": ("i am",),
        "you're": ("you are",),
        "we're": ("we are",),
        "they're": ("they are",),
        "it's": ("it is", "it has"),
        "he's": ("he is", "he has"),
        "she's": ("she is", "she has"),
        "that's": ("that is", "that has"),
        "there's": ("there is", "there has"),
        "here's": ("here is", "here has"),
        "what's": ("what is", "what has"),
        "who's": ("who is", "who has"),
        "where's": ("where is", "where has"),
        "when's": ("when is", "when has"),
        "why's": ("why is", "why has"),
        "how's": ("how is", "how has"),
        "i've": ("i have",),
        "you've": ("you have",),
        "we've": ("we have",),
        "they've": ("they have",),
        "i'll": ("i will",),
        "you'll": ("you will",),
        "he'll": ("he will",),
        "she'll": ("she will",),
        "it'll": ("it will",),
        "we'll": ("we will",),
        "they'll": ("they will",),
        "isn't": ("is not",),
        "aren't": ("are not",),
        "wasn't": ("was not",),
        "weren't": ("were not",),
        "don't": ("do not",),
        "doesn't": ("does not",),
        "didn't": ("did not",),
        "can't": ("cannot", "can not"),
        "couldn't": ("could not",),
        "won't": ("will not",),
        "wouldn't": ("would not",),
        "shouldn't": ("should not",),
        "haven't": ("have not",),
        "hasn't": ("has not",),
        "hadn't": ("had not",),
        "mustn't": ("must not",),
        "needn't": ("need not",),
        "mightn't": ("might not",),
        "shan't": ("shall not",),
        "let's": ("let us",),
    }

    _SUFFIX_EXPANSIONS = {
        "'re": (" are",),
        "'ve": (" have",),
        "'ll": (" will",),
        "n't": (" not",),
        "'d": (" would", " had"),
        "'s": (" is", " has"),
    }

    def build_variants(self, text: Optional[str]) -> set[str]:
        base = self.normalize(text)
        if not base:
            return {""}

        variants = {base}
        pending = [base]

        while pending:
            current = pending.pop()
            for expanded in self._expand_text(current):
                if expanded not in variants:
                    variants.add(expanded)
                    pending.append(expanded)

        return variants

    def _expand_text(self, text: str) -> set[str]:
        expanded_variants: set[str] = set()
        tokens = text.split(" ")

        for index, token in enumerate(tokens):
            replacements = list(self._TOKEN_EXPANSIONS.get(token, ()))
            for suffix, suffix_replacements in self._SUFFIX_EXPANSIONS.items():
                if token.endswith(suffix) and len(token) > len(suffix):
                    stem = token[: -len(suffix)]
                    replacements.extend(f"{stem}{replacement}" for replacement in suffix_replacements)

            for replacement in replacements:
                candidate_tokens = tokens.copy()
                candidate_tokens[index] = replacement
                expanded_variants.add(self.normalize(" ".join(candidate_tokens)))

        return expanded_variants


class AnswerMatcher:
    _CLOSE_MATCH_THRESHOLD = 0.95

    def __init__(self) -> None:
        self._language_rules: dict[str, LanguageRules] = {
            "default": BaseLanguageRules(),
            "en": EnglishLanguageRules(),
        }

    def register_language_rules(self, language_code: str, rules: LanguageRules) -> None:
        self._language_rules[language_code.casefold()] = rules

    def match_text_answer(
        self,
        user_answer: Optional[str],
        expected_answers: Sequence[Optional[str]],
        language_code: Optional[str] = None,
    ) -> bool:
        return self.evaluate_text_answer(user_answer, expected_answers, language_code).is_correct

    def evaluate_text_answer(
        self,
        user_answer: Optional[str],
        expected_answers: Sequence[Optional[str]],
        language_code: Optional[str] = None,
    ) -> AnswerMatchResult:
        rules = self._get_rules(language_code)
        user_variants = rules.build_variants(user_answer)

        for expected_answer in expected_answers:
            if user_variants & rules.build_variants(expected_answer):
                return AnswerMatchResult(
                    is_correct=True,
                    is_close_match=False,
                    closest_answer=str(expected_answer or ""),
                )

        closest_answer, similarity = self._find_closest_answer(
            user_variants=user_variants,
            expected_answers=expected_answers,
            rules=rules,
        )
        return AnswerMatchResult(
            is_correct=False,
            is_close_match=similarity >= self._CLOSE_MATCH_THRESHOLD,
            closest_answer=closest_answer,
        )

    def match_sequence_answer(
        self,
        user_answers: Sequence[Optional[str]],
        expected_answers: Sequence[object],
        language_code: Optional[str] = None,
    ) -> bool:
        return self.evaluate_sequence_answer(user_answers, expected_answers, language_code).is_correct

    def evaluate_sequence_answer(
        self,
        user_answers: Sequence[Optional[str]],
        expected_answers: Sequence[object],
        language_code: Optional[str] = None,
    ) -> AnswerMatchResult:
        if len(user_answers) != len(expected_answers):
            return AnswerMatchResult(is_correct=False, is_close_match=False, closest_answer=None)

        closest_answer = None
        has_close_match = False
        for user_answer, expected_answer in zip(user_answers, expected_answers):
            result = self.evaluate_text_answer(
                user_answer=user_answer,
                expected_answers=self._coerce_expected_variants(expected_answer),
                language_code=language_code,
            )
            if not result.is_correct:
                return result
            if result.closest_answer and closest_answer is None:
                closest_answer = result.closest_answer
            has_close_match = has_close_match or result.is_close_match

        return AnswerMatchResult(
            is_correct=True,
            is_close_match=has_close_match,
            closest_answer=closest_answer,
        )

    def explain_text_answer(
        self,
        user_answer: Optional[str],
        expected_answers: Sequence[Optional[str]],
        language_code: Optional[str] = None,
    ) -> dict[str, object]:
        rules = self._get_rules(language_code)
        return {
            "language_code": language_code or "default",
            "user_variants": sorted(rules.build_variants(user_answer)),
            "expected_variants": {
                str(expected_answer or ""): sorted(rules.build_variants(expected_answer))
                for expected_answer in expected_answers
            },
        }

    def _coerce_expected_variants(self, expected_answer: object) -> list[Optional[str]]:
        if isinstance(expected_answer, str) or expected_answer is None:
            return [expected_answer]
        if isinstance(expected_answer, Iterable):
            return [item for item in expected_answer]
        return [str(expected_answer)]

    def _get_rules(self, language_code: Optional[str]) -> LanguageRules:
        if language_code:
            return self._language_rules.get(language_code.casefold(), self._language_rules["default"])
        return self._language_rules["default"]

    def _find_closest_answer(
        self,
        user_variants: set[str],
        expected_answers: Sequence[Optional[str]],
        rules: LanguageRules,
    ) -> tuple[Optional[str], float]:
        best_answer: Optional[str] = None
        best_score = 0.0

        for expected_answer in expected_answers:
            expected_variants = rules.build_variants(expected_answer)
            for user_variant in user_variants:
                for expected_variant in expected_variants:
                    score = SequenceMatcher(None, user_variant, expected_variant).ratio()
                    if score > best_score:
                        best_score = score
                        best_answer = str(expected_answer or "")

        return best_answer, best_score


answer_matcher = AnswerMatcher()
