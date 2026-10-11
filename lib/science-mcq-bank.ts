import {
  dropSeenQuestions,
  uniqueQuestions,
} from "./question-memory";
import { shuffleQuestionOptions } from "./daily-questions";
import type { AppLanguage } from "./copy";
import type { QuizQuestion, StudyMedium } from "./types";

type BankRow = {
  id: string;
  tags: string[];
  en: Omit<QuizQuestion, "id" | "subject">;
  si: Omit<QuizQuestion, "id" | "subject">;
  ta: Omit<QuizQuestion, "id" | "subject">;
};

const BANK: BankRow[] = [
  {
    id: "sci-photo",
    tags: ["photosynthesis", "ප්‍රභාසංශ්ලේෂණ", "chlorophyll", "leaf"],
    en: {
      prompt: "What is the main job of photosynthesis in a green plant?",
      options: [
        "Make food using sunlight",
        "Only store extra water",
        "Make the soil change colour",
        "Make a sound in the roots",
      ],
      answerIndex: 0,
      explanation: "Chlorophyll uses sunlight so the plant can make food.",
    },
    si: {
      prompt: "හරිත ශාකයක ප්‍රභාසංශ්ලේෂණයේ ප්‍රධාන කාර්යය කුමක්ද?",
      options: [
        "හිරු එළියෙන් ආහාර හදනවා",
        "වතුර විතරක් තියාගන්නවා",
        "පසේ පාට වෙනස් කරනවා",
        "මුල්වලින් හඬක් එනවා",
      ],
      answerIndex: 0,
      explanation: "හරිතප්‍රදය හිරු එළිය අවශෝෂණය කරලා ශාකයට ආහාර හදනවා.",
    },
    ta: {
      prompt: "பச்சைத் தாவரத்தில் ஒளிச்சேர்க்கையின் முக்கிய வேலை என்ன?",
      options: [
        "சூரிய ஒளியில் உணவு தயாரிக்கும்",
        "நீரை மட்டும் சேமிக்கும்",
        "மண்ணின் நிறத்தை மாற்றும்",
        "வேர்களில் ஒலி எழுப்பும்",
      ],
      answerIndex: 0,
      explanation: "பச்சையம் ஒளியை உறிஞ்சி தாவரம் உணவு தயாரிக்க உதவும்.",
    },
  },
  {
    id: "sci-xylem",
    tags: ["xylem", "ශෛලම", "water", "root", "tissue"],
    en: {
      prompt: "What does xylem tissue mainly carry in a plant?",
      options: [
        "Water and minerals upwards",
        "Made food only downwards",
        "Seeds from the flower",
        "Sound through the stem",
      ],
      answerIndex: 0,
      explanation: "Xylem carries water and minerals from roots toward the leaves.",
    },
    si: {
      prompt: "ශාකයේ ශෛලම (xylem) පටකය ප්‍රධාන වශයෙන් ගෙන යන්නේ කුමක්ද?",
      options: [
        "ජලය සහ ඛනිජ ඉහළට",
        "හදපු ආහාර පහළට විතරක්",
        "මලෙන් බීජ",
        "කඳෙන් ශබ්දය",
      ],
      answerIndex: 0,
      explanation: "ශෛලම මුලින් කොළවලට ජලය සහ ඛනිජ ගෙන යනවා.",
    },
    ta: {
      prompt: "தாவரத்தில் சைலம் திசு முக்கியமாக எதை கொண்டு செல்லும்?",
      options: [
        "நீர் மற்றும் கனிமங்களை மேலே",
        "உணவை மட்டும் கீழே",
        "மலரிலிருந்து விதைகள்",
        "தண்டில் ஒலி",
      ],
      answerIndex: 0,
      explanation: "சைலம் வேர்களிலிருந்து இலைகளுக்கு நீர் மற்றும் கனிமங்களை கொண்டு செல்லும்.",
    },
  },
  {
    id: "sci-phloem",
    tags: ["phloem", "ප්ලෝයම", "food", "leaf"],
    en: {
      prompt: "What does phloem tissue carry?",
      options: ["Made food", "Only air", "Bone", "Blood"],
      answerIndex: 0,
      explanation: "Phloem carries food made in the leaves to other parts.",
    },
    si: {
      prompt: "ප්ලෝයම (phloem) පටකය ගෙන යන්නේ කුමක්ද?",
      options: ["හදපු ආහාර", "වාතය විතරක්", "අස්ථි", "රුධිරය"],
      answerIndex: 0,
      explanation: "ප්ලෝයම කොළවල හදපු ආහාර අනිත් කොටස්වලට ගෙන යනවා.",
    },
    ta: {
      prompt: "புளோயம் திசு எதை கொண்டு செல்லும்?",
      options: ["தயாரித்த உணவு", "காற்று மட்டும்", "எலும்பு", "இரத்தம்"],
      answerIndex: 0,
      explanation: "புளோயம் இலைகளில் தயாரித்த உணவை மற்ற பகுதிகளுக்கு கொண்டு செல்லும்.",
    },
  },
  {
    id: "sci-heart",
    tags: ["heart", "හෘදය", "blood", "circulation"],
    en: {
      prompt: "What is the pump of human blood circulation?",
      options: ["Heart", "Liver", "Kidney", "Lung"],
      answerIndex: 0,
      explanation: "The heart pumps blood around the body.",
    },
    si: {
      prompt: "මිනිස් රුධිර සංසරණයේ pump එක කුමක්ද?",
      options: ["හෘදය", "අක්මාව", "වකුගඩුව", "පුප්ඵුසය"],
      answerIndex: 0,
      explanation: "හෘදය රුධිරය ශරීරය පුරා pump කරනවා.",
    },
    ta: {
      prompt: "மனித இரத்த ஓட்டத்தின் பம்ப் எது?",
      options: ["இதயம்", "கல்லீரல்", "சிறுநீரகம்", "நுரையீரல்"],
      answerIndex: 0,
      explanation: "இதயம் உடல் முழுவதும் இரத்தத்தை செலுத்தும்.",
    },
  },
  {
    id: "sci-ph",
    tags: ["acid", "pH", "අම්ල", "base"],
    en: {
      prompt: "What is the pH of an acid?",
      options: ["Below 7", "Exactly 7", "Above 14", "Only 0"],
      answerIndex: 0,
      explanation: "Acids have pH below 7. 7 is neutral.",
    },
    si: {
      prompt: "අම්ලයක pH අගය කොහොමද?",
      options: ["7ට අඩුයි", "හරියටම 7යි", "14ට වැඩියි", "0 විතරක්"],
      answerIndex: 0,
      explanation: "අම්ලවල pH 7ට අඩුයි. 7 උදාසීනයි.",
    },
    ta: {
      prompt: "அமிலத்தின் pH மதிப்பு எப்படி இருக்கும்?",
      options: ["7க்கு குறைவு", "சரியாக 7", "14க்கு மேல்", "0 மட்டும்"],
      answerIndex: 0,
      explanation: "அமிலங்களின் pH 7க்கு குறைவு. 7 நடுநிலை.",
    },
  },
  {
    id: "sci-heat",
    tags: ["heat", "තාපය", "energy", "temperature"],
    en: {
      prompt: "What is heat?",
      options: [
        "Energy that moves because of a temperature difference",
        "A colour",
        "A weight",
        "A sound",
      ],
      answerIndex: 0,
      explanation: "Heat is energy that moves from a hotter place to a colder place.",
    },
    si: {
      prompt: "තාපය (heat) කියන්නේ කුමක්ද?",
      options: [
        "උෂ්ණත්ව වෙනස නිසා යන ශක්තිය",
        "වර්ණයක්",
        "බරක්",
        "ශබ්දයක්",
      ],
      answerIndex: 0,
      explanation: "තාපය උණුසුම් තැනකින් සීතල තැනකට යන ශක්තිය.",
    },
    ta: {
      prompt: "வெப்பம் என்றால் என்ன?",
      options: [
        "வெப்பநிலை வேறுபாட்டால் நகரும் ஆற்றல்",
        "ஒரு நிறம்",
        "ஒரு எடை",
        "ஒரு ஒலி",
      ],
      answerIndex: 0,
      explanation: "வெப்பம் சூடான இடத்திலிருந்து குளிர்ந்த இடத்துக்கு நகரும் ஆற்றல்.",
    },
  },
  {
    id: "sci-newton1",
    tags: ["newton", "force", "inertia", "motion", "නියුටන්"],
    en: {
      prompt: "Newton’s first law is mainly about what idea?",
      options: [
        "An object stays still or keeps moving unless a force changes that",
        "Force is always equal to weight",
        "Heavy things fall sideways",
        "Sound needs no medium",
      ],
      answerIndex: 0,
      explanation: "Inertia: motion stays the same until a net force acts.",
    },
    si: {
      prompt: "නිව්ටන්ගේ පළමු නියමය ප්‍රධාන වශයෙන් කියන්නේ මොකක්ද?",
      options: [
        "බලයක් නැත්නම් වස්තුව නවතිනවා හෝ එලෙසම යනවා",
        "බලය හැමදාම බරට සමානයි",
        "බර වස්තු පැත්තට වැටෙනවා",
        "ශබ්දයට මාධ්‍යයක් ඕන නැහැ",
      ],
      answerIndex: 0,
      explanation: "නිශ්චලතාව: net force එකක් එනකම් චලිතය එලෙසම තියෙනවා.",
    },
    ta: {
      prompt: "நியூட்டனின் முதல் விதி முக்கியமாக எதைக் கூறும்?",
      options: [
        "விசை மாற்றும் வரை பொருள் நிற்கும் அல்லது அதேபோல் செல்லும்",
        "விசை எப்போதும் எடைக்கு சமம்",
        "கனமானவை பக்கவாட்டில் விழும்",
        "ஒலிக்கு ஊடகம் தேவை இல்லை",
      ],
      answerIndex: 0,
      explanation: "நிலைமம்: தொகுபயன் விசை வரும் வரை இயக்கம் மாறாது.",
    },
  },
  {
    id: "sci-sound",
    tags: ["sound", "wave", "medium", "vacuum", "ශබ්ද"],
    en: {
      prompt: "Why can sound not travel in a vacuum?",
      options: [
        "There is no material medium to vibrate",
        "Light is too bright",
        "The temperature is always 0",
        "Sound has no frequency",
      ],
      answerIndex: 0,
      explanation: "Sound is a mechanical wave. It needs a medium.",
    },
    si: {
      prompt: "රික්තයේ ශබ්දය යන්නේ නැත්තේ ඇයි?",
      options: [
        "සෙලවෙන්න පදාර්ථමය මාධ්‍යයක් නැහැ",
        "ආලෝකය වැඩියි",
        "උෂ්ණත්වය හැමදාම 0",
        "ශබ්දයට සංඛ්‍යාතයක් නැහැ",
      ],
      answerIndex: 0,
      explanation: "ශබ්දය යාන්ත්‍රික තරංගයක්. මාධ්‍යයක් ඕන.",
    },
    ta: {
      prompt: "வெற்றிடத்தில் ஒலி செல்லாதது ஏன்?",
      options: [
        "அதிர ஊடகம் இல்லை",
        "ஒளி அதிகம்",
        "வெப்பநிலை எப்போதும் 0",
        "ஒலிக்கு அதிர்வெண் இல்லை",
      ],
      answerIndex: 0,
      explanation: "ஒலி இயந்திர அலை. அதற்கு ஊடகம் வேண்டும்.",
    },
  },
  {
    id: "sci-atom",
    tags: ["atom", "electron", "proton", "nucleus", "පරමාණු"],
    en: {
      prompt: "Which particle orbits the nucleus of an atom?",
      options: ["Electron", "Proton only", "Neutron only", "A whole molecule"],
      answerIndex: 0,
      explanation: "Electrons move around the nucleus. Protons and neutrons are in it.",
    },
    si: {
      prompt: "පරමාණුවක න්‍යෂ්ටිය වටේ යන්නේ කුමන අංශුවද?",
      options: ["ඉලෙක්ට්‍රෝනය", "ප්‍රෝටෝනය විතරක්", "නියුට්‍රෝනය විතරක්", "මුළු අණුව"],
      answerIndex: 0,
      explanation: "ඉලෙක්ට්‍රෝන න්‍යෂ්ටිය වටේ යනවා. ප්‍රෝටෝන සහ නියුට්‍රෝන ඇතුළේ.",
    },
    ta: {
      prompt: "அணுவின் கருவை சுற்றிச் செல்வது எது?",
      options: ["எலக்ட்ரான்", "புரோட்டான் மட்டும்", "நியூட்ரான் மட்டும்", "முழு மூலக்கூறு"],
      answerIndex: 0,
      explanation: "எலக்ட்ரான்கள் கருவைச் சுற்றிச் செல்லும். புரோட்டான் மற்றும் நியூட்ரான் உள்ளே.",
    },
  },
  {
    id: "sci-current",
    tags: ["current", "electric", "circuit", "විදුලි", "ampere"],
    en: {
      prompt: "What is electric current?",
      options: [
        "Flow of electric charge",
        "A type of sound",
        "Only the colour of a wire",
        "The mass of a magnet",
      ],
      answerIndex: 0,
      explanation: "Current is charge flowing through a conductor.",
    },
    si: {
      prompt: "විද්‍යුත් ධාරාව කියන්නේ කුමක්ද?",
      options: [
        "විද්‍යුත් ආරෝපණය ගලා යාම",
        "ශබ්ද වර්ගයක්",
        "කම්බියේ පාට විතරක්",
        "චුම්බකයක ස්කන්ධය",
      ],
      answerIndex: 0,
      explanation: "ධාරාව කියන්නේ සන්නායකයකින් ආරෝපණ ගලා යන එක.",
    },
    ta: {
      prompt: "மின்சாரம் என்றால் என்ன?",
      options: [
        "மின்சுமை ஓடுவது",
        "ஒரு ஒலி வகை",
        "கம்பி நிறம் மட்டும்",
        "காந்தத்தின் நிறை",
      ],
      answerIndex: 0,
      explanation: "மின்னோட்டம் கடத்தியில் சுமை ஓடுவது.",
    },
  },
  {
    id: "sci-nucleus-cell",
    tags: ["cell", "nucleus", "සෛල", "control"],
    en: {
      prompt: "What is the main job of the nucleus in an animal cell?",
      options: [
        "Control the cell’s activities",
        "Only store extra water",
        "Make the cell float in air",
        "Give the cell a smell",
      ],
      answerIndex: 0,
      explanation: "The nucleus holds DNA and controls the cell.",
    },
    si: {
      prompt: "සත්ත්ව සෛලයක න්‍යෂ්ටියේ ප්‍රධාන කාර්යය කුමක්ද?",
      options: [
        "සෛලයේ ක්‍රියා පාලනය කරනවා",
        "වතුර විතරක් තියාගන්නවා",
        "සෛලය අහසේ පාකරනවා",
        "සෛලයට ගඳක් දෙනවා",
      ],
      answerIndex: 0,
      explanation: "න්‍යෂ්ටියේ DNA තියෙනවා. ඒක සෛලය පාලනය කරනවා.",
    },
    ta: {
      prompt: "விலங்கு செல்லில் கருவின் முக்கிய வேலை என்ன?",
      options: [
        "செல்லின் செயல்களை கட்டுப்படுத்தும்",
        "நீரை மட்டும் சேமிக்கும்",
        "செல்லை காற்றில் மிதக்கும்",
        "செல்லுக்கு வாசனை கொடுக்கும்",
      ],
      answerIndex: 0,
      explanation: "கருவில் DNA உள்ளது. அது செல்லை கட்டுப்படுத்தும்.",
    },
  },
  {
    id: "sci-neutral",
    tags: ["acid", "base", "neutral", "salt", "උදාසීන"],
    en: {
      prompt: "What do you get when an acid reacts with a base?",
      options: ["Salt and water", "Only oxygen", "Only light", "A magnet"],
      answerIndex: 0,
      explanation: "Neutralisation makes a salt and water.",
    },
    si: {
      prompt: "අම්ලයක් සහ භෂ්මයක් ප්‍රතික්‍රියා වුණාම හැදෙන්නේ කුමක්ද?",
      options: ["ලවණය සහ ජලය", "ඔක්සිජන් විතරක්", "ආලෝකය විතරක්", "චුම්බකයක්"],
      answerIndex: 0,
      explanation: "උදාසීනකරණයෙන් ලවණයක් සහ ජලය හැදෙනවා.",
    },
    ta: {
      prompt: "அமிலம் காரத்துடன் வினைபுரியும்போது கிடைப்பது எது?",
      options: ["உப்பு மற்றும் நீர்", "ஆக்சிஜன் மட்டும்", "ஒளி மட்டும்", "ஒரு காந்தம்"],
      answerIndex: 0,
      explanation: "நடுநிலையாக்கத்தில் உப்பும் நீரும் உருவாகும்.",
    },
  },
  {
    id: "sci-reflect",
    tags: ["light", "reflection", "mirror", "ආලෝක", "පරාවර්තන"],
    en: {
      prompt: "On a plane mirror, the angle of incidence equals what?",
      options: [
        "The angle of reflection",
        "The mass of the mirror",
        "The colour of the room",
        "The speed of sound",
      ],
      answerIndex: 0,
      explanation: "For reflection, i = r.",
    },
    si: {
      prompt: "තල දර්පණයක පತන කෝණය සමාන වන්නේ කුමකටද?",
      options: [
        "පරාවර්තන කෝණයට",
        "දර්පණයේ ස්කන්ධයට",
        "කාමරේ පාටට",
        "ශබ්දයේ වේගයට",
      ],
      answerIndex: 0,
      explanation: "පරාවර්තනයේදී i = r.",
    },
    ta: {
      prompt: "தள ஆடியில் படுகோணம் எதற்கு சமம்?",
      options: [
        "எதிரொளிப்புக் கோணம்",
        "ஆடியின் நிறை",
        "அறை நிறம்",
        "ஒலி வேகம்",
      ],
      answerIndex: 0,
      explanation: "எதிரொளிப்பில் i = r.",
    },
  },
  {
    id: "sci-density",
    tags: ["density", "mass", "volume", "ඝනත්ව"],
    en: {
      prompt: "Density is equal to which pair?",
      options: ["Mass / volume", "Force × time", "Speed / mass", "Area × heat"],
      answerIndex: 0,
      explanation: "Density = mass divided by volume.",
    },
    si: {
      prompt: "ඝනත්වය සමාන වන්නේ කුමන යුගලටද?",
      options: ["ස්කන්ධය / පරිමාව", "බලය × කාලය", "වේගය / ස්කන්ධය", "වර්ගඵලය × තාපය"],
      answerIndex: 0,
      explanation: "ඝනත්වය = ස්කන්ධය ÷ පරිමාව.",
    },
    ta: {
      prompt: "அடர்த்தி எதற்கு சமம்?",
      options: ["நிறை / பருமன்", "விசை × நேரம்", "வேகம் / நிறை", "பரப்பு × வெப்பம்"],
      answerIndex: 0,
      explanation: "அடர்த்தி = நிறை ÷ பருமன்.",
    },
  },
  {
    id: "sci-respire",
    tags: ["respiration", "oxygen", "energy", "ශ්වසන"],
    en: {
      prompt: "Why do living cells respire?",
      options: [
        "To release energy from food",
        "To make the cell green",
        "To store extra soil",
        "To stop the heart",
      ],
      answerIndex: 0,
      explanation: "Respiration releases energy from food, often using oxygen.",
    },
    si: {
      prompt: "ජීවී සෛල ශ්වසනය කරන්නේ ඇයි?",
      options: [
        "ආහාරයෙන් ශක්තිය මුදාහරින්න",
        "සෛලය කොළ පාට කරන්න",
        "පස තියාගන්න",
        "හෘදය නවත්වන්න",
      ],
      answerIndex: 0,
      explanation: "ශ්වසනයෙන් ආහාරයෙන් ශක්තිය ලැබෙනවා. බොහෝ විට ඔක්සිජන් ඕන.",
    },
    ta: {
      prompt: "உயிர் செல்கள் சுவாசிப்பது ஏன்?",
      options: [
        "உணவிலிருந்து ஆற்றலை வெளியிட",
        "செல்லை பச்சையாக்க",
        "மண்ணை சேமிக்க",
        "இதயத்தை நிறுத்த",
      ],
      answerIndex: 0,
      explanation: "சுவாசம் உணவிலிருந்து ஆற்றலை வெளியிடும். பெரும்பாலும் ஆக்சிஜன் தேவை.",
    },
  },
  {
    id: "sci-magnet",
    tags: ["magnet", "pole", "iron", "චුම්බක"],
    en: {
      prompt: "What happens if you bring two north poles of magnets together?",
      options: ["They repel", "They always melt", "They make food", "They become water"],
      answerIndex: 0,
      explanation: "Like poles repel. Unlike poles attract.",
    },
    si: {
      prompt: "චුම්බක දෙකක උත්තර ධ්‍රැව දෙක එකට ගේව්වොත් මොකද වෙන්නේ?",
      options: ["විකර්ෂණය වෙනවා", "හැමදාම දියවෙනවා", "ආහාර හදනවා", "ජලය වෙනවා"],
      answerIndex: 0,
      explanation: "සමාන ධ්‍රැව විකර්ෂණය වෙනවා. වෙනස් ධ්‍රැව ආකර්ෂණය වෙනවා.",
    },
    ta: {
      prompt: "இரண்டு வட துருவங்களை நெருக்கினால் என்ன ஆகும்?",
      options: ["விலக்கும்", "எப்போதும் உருகும்", "உணவு தயாரிக்கும்", "நீராகும்"],
      answerIndex: 0,
      explanation: "ஒரே துருவங்கள் விலக்கும். எதிர் துருவங்கள் கவரும்.",
    },
  },
  {
    id: "sci-evap",
    tags: ["evaporation", "water cycle", "වාෂ්ප", "state"],
    en: {
      prompt: "What is evaporation?",
      options: [
        "Liquid changing to gas at the surface",
        "Gas turning into a magnet",
        "A solid gaining extra mass",
        "Light turning into sound",
      ],
      answerIndex: 0,
      explanation: "Water at the surface can become vapour without boiling.",
    },
    si: {
      prompt: "වාෂ්පීකරණය කියන්නේ කුමක්ද?",
      options: [
        "ද්‍රවයක් පෘෂ්ඨයෙන් වායුවක් වෙන එක",
        "වායුවක් චුම්බකයක් වෙන එක",
        "ඝනයක ස්කන්ධය වැඩි වෙන එක",
        "ආලෝකය ශබ්දයක් වෙන එක",
      ],
      answerIndex: 0,
      explanation: "ජලය තාපාංකයට නොගිහින් පෘෂ්ඨයෙන් වාෂ්ප වෙන්න පුළුවන්.",
    },
    ta: {
      prompt: "ஆவியாதல் என்றால் என்ன?",
      options: [
        "திரவம் மேற்பரப்பில் வாயுவாவது",
        "வாயு காந்தமாவது",
        "திண்ம நிறை கூடுவது",
        "ஒளி ஒலியாவது",
      ],
      answerIndex: 0,
      explanation: "நீர் கொதிக்காமல் மேற்பரப்பில் ஆவியாகலாம்.",
    },
  },
  {
    id: "sci-force",
    tags: ["force", "newton", "mass", "acceleration", "බලය"],
    en: {
      prompt: "What does F = ma mean?",
      options: [
        "Force equals mass times acceleration",
        "Force equals mass plus area",
        "Force equals heat divided by time",
        "Force equals colour times speed",
      ],
      answerIndex: 0,
      explanation: "Newton’s second law: a bigger force gives a bigger acceleration for the same mass.",
    },
    si: {
      prompt: "F = ma කියන්නේ කුමක්ද?",
      options: [
        "බලය = ස්කන්ධය × ත්වරණය",
        "බලය = ස්කන්ධය + වර්ගඵලය",
        "බලය = තාපය ÷ කාලය",
        "බලය = පාට × වේගය",
      ],
      answerIndex: 0,
      explanation: "නිව්ටන්ගේ දෙවෙනි නියමය: එකම ස්කන්ධයට වැඩි බලයක් නම් වැඩි ත්වරණයක්.",
    },
    ta: {
      prompt: "F = ma என்றால் என்ன?",
      options: [
        "விசை = நிறை × முடுக்கம்",
        "விசை = நிறை + பரப்பு",
        "விசை = வெப்பம் ÷ நேரம்",
        "விசை = நிறம் × வேகம்",
      ],
      answerIndex: 0,
      explanation: "நியூட்டனின் இரண்டாம் விதி: அதே நிறைக்கு அதிக விசை அதிக முடுக்கம் தரும்.",
    },
  },
  {
    id: "sci-em",
    tags: ["electromagnetic", "wave", "light", "vacuum", "විද්‍යුත්"],
    en: {
      prompt: "Which kind of wave can travel through a vacuum?",
      options: [
        "Electromagnetic wave",
        "Sound wave",
        "Water ripple only",
        "A wave on a rope only",
      ],
      answerIndex: 0,
      explanation: "Light and other EM waves do not need a material medium.",
    },
    si: {
      prompt: "රික්තයේ යන්න පුළුවන් තරංග වර්ගය කුමක්ද?",
      options: [
        "විද්‍යුත් චුම්බක තරංගය",
        "ශබ්ද තරංගය",
        "ජල රැළිය විතරක්",
        "කඹයේ රැළිය විතරක්",
      ],
      answerIndex: 0,
      explanation: "ආලෝකය වගේ EM තරංගවලට පදාර්ථමය මාධ්‍යයක් ඕන නැහැ.",
    },
    ta: {
      prompt: "வெற்றிடத்தில் செல்லக்கூடிய அலை எது?",
      options: [
        "மின்காந்த அலை",
        "ஒலி அலை",
        "நீர் அலை மட்டும்",
        "கயிறு அலை மட்டும்",
      ],
      answerIndex: 0,
      explanation: "ஒளி போன்ற மின்காந்த அலைகளுக்கு ஊடகம் தேவை இல்லை.",
    },
  },
  {
    id: "sci-enzyme",
    tags: ["enzyme", "catalyst", "digestion", "එන්සයිම"],
    en: {
      prompt: "What is the main job of an enzyme in the body?",
      options: [
        "Speed up a chemical reaction",
        "Store extra iron only",
        "Make the bones blue",
        "Stop all heat flow",
      ],
      answerIndex: 0,
      explanation: "Enzymes are biological catalysts.",
    },
    si: {
      prompt: "ශරීරයේ එන්සයිමයක ප්‍රධාන කාර්යය කුමක්ද?",
      options: [
        "රසායනික ප්‍රතික්‍රියාවක් වේගවත් කරනවා",
        "යකඩ විතරක් තියාගන්නවා",
        "අස්ථි නිල් කරනවා",
        "තාපය හැමදාම නවත්වනවා",
      ],
      answerIndex: 0,
      explanation: "එන්සයිම ජෛව උත්ප්‍රේරක.",
    },
    ta: {
      prompt: "உடலில் நொதியின் முக்கிய வேலை என்ன?",
      options: [
        "வேதிவினையை விரைவுபடுத்தும்",
        "இரும்பை மட்டும் சேமிக்கும்",
        "எலும்பை நீலமாக்கும்",
        "வெப்ப ஓட்டத்தை நிறுத்தும்",
      ],
      answerIndex: 0,
      explanation: "நொதிகள் உயிரியல் வினையூக்கிகள்.",
    },
  },
];

function hashSeed(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function seededShuffle<T>(items: T[], seed: string) {
  const next = [...items];
  let state = hashSeed(seed) + 1;
  for (let i = next.length - 1; i > 0; i -= 1) {
    state = (state * 16807) % 2147483647;
    const j = state % (i + 1);
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function topicScore(tags: string[], topics: string[]) {
  if (!topics.length) return 0;
  const hay = tags.join(" ").toLowerCase();
  return topics.reduce((score, topic) => {
    const words = topic
      .toLowerCase()
      .split(/[^a-z0-9\u0d80-\u0dff\u0b80-\u0bff]+/i)
      .filter((word) => word.length > 2);
    return (
      score +
      words.reduce((inner, word) => (hay.includes(word) ? inner + 2 : inner), 0)
    );
  }, 0);
}

function localize(row: BankRow, language: AppLanguage, medium: StudyMedium) {
  const pack =
    medium === "tamil"
      ? row.ta
      : language === "english" || medium === "english"
        ? row.en
        : row.si;
  return shuffleQuestionOptions({
    id: row.id,
    subject: "Science",
    ...pack,
  });
}

export function pickScienceMcqs(input: {
  language: AppLanguage;
  medium?: StudyMedium;
  size: number;
  seed: string;
  avoid?: string[];
  topics?: string[];
}): QuizQuestion[] {
  const medium = input.medium ?? "sinhala";
  const ranked = [...BANK].sort(
    (a, b) =>
      topicScore(b.tags, input.topics || []) -
      topicScore(a.tags, input.topics || []),
  );
  const localized = ranked.map((row) => localize(row, input.language, medium));
  const fresh = dropSeenQuestions(localized, input.avoid || []);
  const pool = uniqueQuestions(
    seededShuffle(fresh.length >= input.size ? fresh : [...fresh, ...localized], input.seed),
  );
  const picked = pool.slice(0, input.size);
  if (picked.length >= input.size) return picked;
  return uniqueQuestions([...picked, ...localized]).slice(0, input.size);
}
