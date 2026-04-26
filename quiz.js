/* ═══════════════════════════════════════════════════════════════
   quiz.js — Kync 대화 유형 검사 (완전판)
   축: A 직접성 / B 감정표현 / C 지향성 / D 주도성
   부모 6유형 / 자녀 6유형 / 레이더 차트 / 4축 점수 / 궁합
═══════════════════════════════════════════════════════════════ */

/* ─── 축 정의 ─── */
const AXES = [
  { id:'A', name:'직접성',   lo:'간접적',   hi:'직접적'   },
  { id:'B', name:'감정표현', lo:'억제형',   hi:'표현형'   },
  { id:'C', name:'지향성',   lo:'공감지향', hi:'해결지향'  },
  { id:'D', name:'주도성',   lo:'수용적',   hi:'주도적'   },
];

/* ─── 부모 20문항 ─── */
const PARENT_QS = [
  { axis:'A', tag:'직접성', q:'자녀에게 중요한 말을 전해야 할 때?',
    opts:[{t:'바로 불러서 직접 말해요',s:4},{t:'문자로 먼저 운을 띄워요',s:3},{t:'분위기 보다가 말해요',s:2},{t:'알아서 알겠지 하고 기다려요',s:1}] },
  { axis:'A', tag:'직접성', q:'자녀 행동이 마음에 들지 않을 때?',
    opts:[{t:'그 자리에서 바로 말해요',s:4},{t:'나중에 조용히 말해요',s:3},{t:'한번 참고 지켜봐요',s:2},{t:'그냥 넘어가요',s:1}] },
  { axis:'A', tag:'직접성', q:'"지금 공부 어때?"라고 묻고 싶을 때?',
    opts:[{t:'바로 물어봐요',s:4},{t:'분위기 보고 물어봐요',s:3},{t:'물어보고 싶지만 참아요',s:2},{t:'굳이 먼저 안 물어봐요',s:1}] },
  { axis:'A', tag:'직접성', q:'자녀를 칭찬하고 싶을 때?',
    opts:[{t:'바로 "잘했어"라고 말해요',s:4},{t:'뭔가 해주는 것으로 대신해요',s:3},{t:'내색 없이 뿌듯해해요',s:2},{t:'나중에 다른 사람한테 자랑해요',s:1}] },
  { axis:'A', tag:'직접성', q:'자녀가 잘못된 방향으로 가고 있을 때?',
    opts:[{t:'즉시 솔직하게 전해요',s:4},{t:'부드럽게 돌려 말해요',s:3},{t:'상황을 만들어서 말해요',s:2},{t:'스스로 깨달을 때까지 기다려요',s:1}] },
  { axis:'B', tag:'감정표현', q:'자녀 때문에 많이 걱정될 때?',
    opts:[{t:'"걱정돼"라고 직접 표현해요',s:4},{t:'걱정되지만 내색 않고 지켜봐요',s:3},{t:'혼자 속으로 삭혀요',s:2},{t:'배우자나 지인에게 털어놔요',s:1}] },
  { axis:'B', tag:'감정표현', q:'자녀와 대화하다 화가 났을 때?',
    opts:[{t:'감정을 바로 표현해요',s:4},{t:'목소리가 높아지지만 이유를 설명해요',s:3},{t:'자리를 피해서 식혀요',s:2},{t:'아무 말 없이 조용히 있어요',s:1}] },
  { axis:'B', tag:'감정표현', q:'자녀가 힘들어 보일 때?',
    opts:[{t:'"힘들지? 나도 마음이 아파"라고 말해요',s:4},{t:'말 없이 옆에 있어줘요',s:3},{t:'맛있는 것을 챙겨줘요',s:2},{t:'건드리지 않고 지켜봐요',s:1}] },
  { axis:'B', tag:'감정표현', q:'자녀가 "내버려 둬"라고 할 때?',
    opts:[{t:'"왜?"하며 서운함을 표현해요',s:4},{t:'서운하지만 말 안 하고 물러나요',s:3},{t:'나중에 다시 시도해요',s:2},{t:'이해하고 조용히 기다려요',s:1}] },
  { axis:'B', tag:'감정표현', q:'자녀가 좋은 성과를 냈을 때?',
    opts:[{t:'기쁨을 크게 표현해요',s:4},{t:'"잘했어!" 하고 진심으로 말해요',s:3},{t:'담담하게 뿌듯해해요',s:2},{t:'웃어주는 것으로 대신해요',s:1}] },
  { axis:'C', tag:'지향성', q:'자녀가 고민을 털어놓을 때 첫 반응은?',
    opts:[{t:'해결책이 바로 떠올라요',s:4},{t:'원인부터 파악해요',s:3},{t:'"많이 힘들었겠다" 공감해요',s:2},{t:'끝까지 들어요',s:1}] },
  { axis:'C', tag:'지향성', q:'자녀가 학원을 그만 다니고 싶다고 할 때?',
    opts:[{t:'대안이 뭔지 먼저 물어봐요',s:4},{t:'왜 그런 마음이 들었는지 물어봐요',s:3},{t:'"그랬구나"라고 받아줘요',s:2},{t:'더 이야기할 공간을 줘요',s:1}] },
  { axis:'C', tag:'지향성', q:'대화에서 더 중요하게 생각하는 것은?',
    opts:[{t:'문제가 해결됐는가',s:4},{t:'서로 명확하게 이해했는가',s:3},{t:'자녀가 이해받았다고 느꼈는가',s:2},{t:'대화 후 관계가 가까워졌는가',s:1}] },
  { axis:'C', tag:'지향성', q:'같은 갈등이 반복될 때?',
    opts:[{t:'근본 원인을 해결하려 해요',s:4},{t:'규칙을 새로 정해요',s:3},{t:'참고 적절한 때를 기다려요',s:2},{t:'내 방식을 돌아봐요',s:1}] },
  { axis:'C', tag:'지향성', q:'자녀가 틀렸다고 느껴질 때?',
    opts:[{t:'바로잡아 주는 것이 역할이라 생각해요',s:4},{t:'이유 듣고 나서 내 생각을 말해요',s:3},{t:'감정을 먼저 이해해요',s:2},{t:'스스로 깨달을 때까지 기다려요',s:1}] },
  { axis:'D', tag:'주도성', q:'중요한 결정을 앞두고 자녀와 얘기할 때?',
    opts:[{t:'내 의견 먼저 말하고 설득해요',s:4},{t:'내 의견은 있지만 먼저 들어요',s:3},{t:'자녀 의견 듣고 함께 정해요',s:2},{t:'자녀 결정을 존중해요',s:1}] },
  { axis:'D', tag:'주도성', q:'대화 분위기가 어색해질 때?',
    opts:[{t:'화제를 바꾸거나 먼저 말을 이어요',s:4},{t:'가볍게 농담으로 풀어요',s:3},{t:'잠깐 기다렸다 상대를 봐요',s:2},{t:'침묵도 괜찮으니 채우지 않아요',s:1}] },
  { axis:'D', tag:'주도성', q:'가족 간 의견이 충돌할 때?',
    opts:[{t:'내 입장을 분명히 설명해요',s:4},{t:'합의점을 찾으려고 조율해요',s:3},{t:'상대 말을 더 들어요',s:2},{t:'갈등이 싫어서 내가 양보해요',s:1}] },
  { axis:'D', tag:'주도성', q:'자녀의 대학·진로 방향에 대해?',
    opts:[{t:'내 생각하는 최선을 적극 권유해요',s:4},{t:'선택지를 제안하고 함께 고민해요',s:3},{t:'자녀 의견 들으며 맞춰가요',s:2},{t:'자녀 선택을 믿고 따라가요',s:1}] },
  { axis:'D', tag:'주도성', q:'자녀가 내 조언을 무시할 때?',
    opts:[{t:'왜 안 듣는지 다시 설명해요',s:4},{t:'자녀 입장에서 다시 생각해봐요',s:3},{t:'서운하지만 선택을 존중해요',s:2},{t:'괜찮아요, 자녀가 결정하는 게 맞아요',s:1}] },
];

/* ─── 자녀 20문항 ─── */
const CHILD_QS = [
  { axis:'A', tag:'직접성', q:'부모님께 하고 싶은 말이 있을 때?',
    opts:[{t:'그 자리에서 바로 말해요',s:4},{t:'문자로 먼저 보내요',s:3},{t:'타이밍 보다가 슬쩍 말해요',s:2},{t:'말 안 하고 그냥 넘겨요',s:1}] },
  { axis:'A', tag:'직접성', q:'부모님이 싫은 말을 했을 때?',
    opts:[{t:'"그 말 듣기 싫어요"라고 바로 말해요',s:4},{t:'나중에 조용히 말해요',s:3},{t:'표정이나 태도로 티를 내요',s:2},{t:'그냥 참아요',s:1}] },
  { axis:'A', tag:'직접성', q:'부모님이 "공부 어때?"라고 물을 때?',
    opts:[{t:'솔직하게 현황을 말해요',s:4},{t:'대충 요약해서 말해요',s:3},{t:'"그냥요"라고 짧게 대답해요',s:2},{t:'귀찮아서 대답하기 싫어요',s:1}] },
  { axis:'A', tag:'직접성', q:'부모님과 의견이 다를 때?',
    opts:[{t:'내 생각을 명확하게 말해요',s:4},{t:'부드럽게 내 의견을 설명해요',s:3},{t:'반응은 보이지만 말로는 잘 안 해요',s:2},{t:'그냥 맞춰요',s:1}] },
  { axis:'A', tag:'직접성', q:'부모님이 나를 잘못 이해했을 때?',
    opts:[{t:'바로 "그게 아니에요"라고 정정해요',s:4},{t:'조금 설명하려 시도해요',s:3},{t:'설명이 귀찮아서 그냥 둬요',s:2},{t:'오해해도 상관없어요',s:1}] },
  { axis:'B', tag:'감정표현', q:'오늘 많이 지쳤을 때 집에 오면?',
    opts:[{t:'"오늘 너무 힘들었어요"라고 말해요',s:4},{t:'표정이나 분위기로 티가 나요',s:3},{t:'방에 들어가서 혼자 있어요',s:2},{t:'아무렇지 않은 척 해요',s:1}] },
  { axis:'B', tag:'감정표현', q:'부모님한테 속상한 일이 있을 때?',
    opts:[{t:'"그게 속상했어요"라고 직접 말해요',s:4},{t:'말은 안 하지만 티가 나요',s:3},{t:'친구한테만 털어놔요',s:2},{t:'혼자 삭혀요',s:1}] },
  { axis:'B', tag:'감정표현', q:'지금 나의 감정 상태를 부모님이 안다면?',
    opts:[{t:'알아도 괜찮아요, 표현하고 싶어요',s:4},{t:'알아주면 좋겠는데 말하기 어려워요',s:3},{t:'부담스러울 것 같아서 모르는 게 나아요',s:2},{t:'절대 알리고 싶지 않아요',s:1}] },
  { axis:'B', tag:'감정표현', q:'부모님이 칭찬해줄 때 나는?',
    opts:[{t:'"고마워요, 기분 좋아요"라고 말해요',s:4},{t:'쑥스럽지만 좋다는 게 티 나요',s:3},{t:'뭐라 답할지 몰라서 얼버무려요',s:2},{t:'별로 반응 안 해요',s:1}] },
  { axis:'B', tag:'감정표현', q:'시험을 망쳤을 때 부모님 앞에서?',
    opts:[{t:'솔직하게 망했다고 말하고 속상함을 표현해요',s:4},{t:'말 안 해도 분위기로 알겠죠',s:3},{t:'아무렇지 않은 척 해요',s:2},{t:'부모님이 알게 될까 봐 긴장해요',s:1}] },
  { axis:'C', tag:'지향성', q:'부모님이 고민을 물어봐줄 때 내가 원하는 건?',
    opts:[{t:'구체적인 조언이나 해결책이요',s:4},{t:'같이 원인을 파악해 주는 것이요',s:3},{t:'"많이 힘들었겠다"는 공감이요',s:2},{t:'그냥 끝까지 들어주는 것이요',s:1}] },
  { axis:'C', tag:'지향성', q:'부모님과 갈등이 생겼을 때 나는?',
    opts:[{t:'빨리 해결하고 싶어요',s:4},{t:'왜 생겼는지 알고 싶어요',s:3},{t:'내 감정이 먼저 인정받고 싶어요',s:2},{t:'시간이 지나면 풀리길 바라요',s:1}] },
  { axis:'C', tag:'지향성', q:'부모님이 나 때문에 걱정할 때 원하는 건?',
    opts:[{t:'같이 해결책을 찾아줬으면 해요',s:4},{t:'왜 그런지 먼저 물어봐줬으면 해요',s:3},{t:'걱정하는 마음만 느껴줬으면 해요',s:2},{t:'그냥 내버려뒀으면 해요',s:1}] },
  { axis:'C', tag:'지향성', q:'대화에서 내가 더 중요하게 느끼는 것은?',
    opts:[{t:'문제가 해결됐는가',s:4},{t:'서로 명확하게 이해했는가',s:3},{t:'내가 이해받았다는 느낌이 들었는가',s:2},{t:'대화 후 관계가 편해졌는가',s:1}] },
  { axis:'C', tag:'지향성', q:'부모님이 잔소리를 할 때 원하는 건?',
    opts:[{t:'맞다면 구체적 방법도 알려줬으면 해요',s:4},{t:'왜 그런 말을 하는지 이유를 알고 싶어요',s:3},{t:'내 상황을 먼저 이해해줬으면 해요',s:2},{t:'그냥 아무 말도 안 했으면 해요',s:1}] },
  { axis:'D', tag:'주도성', q:'부모님이 내 결정에 의견을 낼 때?',
    opts:[{t:'"제 결정이에요"라고 분명하게 말해요',s:4},{t:'내 의견을 설명하고 설득해요',s:3},{t:'부모님 말을 듣고 함께 생각해봐요',s:2},{t:'부모님 뜻대로 맞춰요',s:1}] },
  { axis:'D', tag:'주도성', q:'중요한 결정(대학, 학원 등)을 할 때?',
    opts:[{t:'내 의견이 먼저 반영됐으면 해요',s:4},{t:'충분히 설명하고 함께 정해요',s:3},{t:'부모님 의견을 많이 참고해요',s:2},{t:'부모님이 정해주는 게 편해요',s:1}] },
  { axis:'D', tag:'주도성', q:'부모님과 대화가 어색해질 때?',
    opts:[{t:'내가 먼저 화제를 바꿔요',s:4},{t:'가볍게 농담을 던져요',s:3},{t:'잠깐 기다려봐요',s:2},{t:'그냥 그 상태로 있어요',s:1}] },
  { axis:'D', tag:'주도성', q:'부모님이 내 계획을 바꾸라고 할 때?',
    opts:[{t:'논거를 들어 반박해요',s:4},{t:'내 계획을 설명하고 이해를 구해요',s:3},{t:'어느 정도 수용하면서 조정해요',s:2},{t:'그냥 부모님 말대로 해요',s:1}] },
  { axis:'D', tag:'주도성', q:'가족 결정에서 내 의견이 무시됐을 때?',
    opts:[{t:'적극적으로 내 의견이 왜 필요한지 말해요',s:4},{t:'다음에 다시 한번 얘기해요',s:3},{t:'서운하지만 따라가요',s:2},{t:'원래 그런 거라 별로 신경 안 써요',s:1}] },
];

/* ─── 부모 6유형 ─── */
function getParentType(s){
  const {A,B,C,D}=s;
  if(A>=7&&C>=7&&D>=6) return {
    name:'지휘형 부모',sub:'직접적 · 해결중심 · 주도적',reliability:96,
    summary:'문제를 빠르게 파악하고 해결책을 제시하는 것이 자연스러워요. 자녀를 아끼기 때문에 "방법을 알려줘야 한다"는 마음이 강하게 작동해요. 분명한 기준과 방향을 제시하지만, 자녀 입장에서는 결정권이 없다고 느낄 수 있어요.',
    strengths:['위기 상황에서 빠른 결정과 방향 제시 능력','자녀에게 명확한 기준과 기대치를 전달해요','흔들리지 않는 일관된 태도가 안정감을 줘요','복잡한 문제를 단순하게 정리해주는 능력'],
    cautions:['자녀가 "판단받는 느낌"에 대화를 닫을 수 있어요','공감보다 해결이 먼저라 속마음을 숨기게 돼요','"왜?"라는 질문이 심문처럼 느껴질 수 있어요','자녀의 자율성이 침해된다고 느낄 수 있어요'],
    tips:[{t:'해결책보다 먼저 "많이 힘들었겠다" 한마디',e:'자녀는 답보다 공감을 먼저 원해요'},{t:'"왜?"를 "어떤 기분이야?"로 바꿔보세요',e:'원인 파악보다 감정 수용이 대화를 열어요'},{t:'결정 전에 자녀 의견을 한 번 물어봐요',e:'"네 생각은 어때?"가 관계를 바꿔요'}],
    gauges:[{label:'공감 지향',val:30,color:'#5a9e6f'},{label:'해결 지향',val:88,color:'#c17f4a'},{label:'감정 표현',val:65,color:'#3d3530'},{label:'자율 존중',val:35,color:'#a09b95'}],
    compat:[{type:'솔직형 자녀',badge:'good',desc:'서로 직접적이라 갈등이 빠르게 해결돼요. 단, 충돌 강도가 높을 수 있어요.'},{type:'논리형 자녀',badge:'good',desc:'둘 다 해결 지향이라 실용적 대화가 잘 이뤄져요.'},{type:'내향형 자녀',badge:'hard',desc:'자녀가 압도되어 완전히 입을 닫을 수 있어요. 속도를 늦추는 게 핵심이에요.'}],
    othersView:'명확하고 빠른 부모. 가끔 너무 앞서나가거나 밀어붙이는 느낌.',myIntent:'이 아이가 덜 고생했으면 해서 방법을 알려주고 싶은 것뿐이에요.',
  };
  if(A>=7&&B>=7) return {
    name:'표현형 부모',sub:'직접적 · 감정 표현형',reliability:95,
    summary:'감정을 솔직하게 표현하고, 자녀에게도 속마음을 말해줬으면 하는 바람이 있어요. 대화를 통해 관계가 가까워진다고 믿어요. 때로는 감정이 먼저 앞서서 자녀가 부담을 느끼기도 해요.',
    strengths:['솔직한 감정 표현으로 관계가 투명해요','자녀가 "숨기는 게 없구나"를 느껴 신뢰가 생겨요','대화를 먼저 시도하는 용기와 에너지','자녀의 감정 표현을 자연스럽게 여기는 환경'],
    cautions:['감정 표현이 강할 때 자녀가 위축될 수 있어요','자녀 속도보다 빠르게 감정을 꺼내려 할 수 있어요','감정이 클 때 말이 날카로워져 상처를 줄 수 있어요','자녀가 표현하지 않으면 답답함을 느껴요'],
    tips:[{t:'내 감정을 말하되, 자녀 감정도 물어봐요',e:'"나는 이런 기분이야. 너는 어때?"'},{t:'자녀가 말하기 전에 먼저 공간을 줘요',e:'5초 침묵이 대화를 더 열어줘요'},{t:'감정이 클 때는 잠깐 쉬고 말해요',e:'감정이 식은 뒤 대화가 더 잘 전달돼요'}],
    gauges:[{label:'공감 지향',val:62,color:'#5a9e6f'},{label:'해결 지향',val:58,color:'#c17f4a'},{label:'감정 표현',val:90,color:'#3d3530'},{label:'자율 존중',val:55,color:'#a09b95'}],
    compat:[{type:'감수형 자녀',badge:'good',desc:'감정을 중요하게 여기는 공통점. 서로 알아봐줄 수 있어요.'},{type:'솔직형 자녀',badge:'mid',desc:'둘 다 직접적이어서 빠르게 연결되지만 충돌도 잦아요.'},{type:'논리형 자녀',badge:'hard',desc:'자녀가 감정 중심 대화에 피로를 느낄 수 있어요.'}],
    othersView:'솔직하고 에너지 넘치는 부모. 가끔 너무 많이 말하는 느낌.',myIntent:'가까이 있고 싶어서예요. 마음을 나누고 싶어요.',
  };
  if(A<7&&C>=7&&D>=6) return {
    name:'관찰형 부모',sub:'간접적 · 해결 지향 · 신중한',reliability:94,
    summary:'직접 말하기보다는 상황을 파악한 뒤 조용히 도움을 주는 편이에요. 자녀를 세심하게 관찰하지만, 자녀 입장에서는 부모의 마음이 잘 안 느껴질 수 있어요.',
    strengths:['섣불리 개입하지 않고 감정적으로 안정적','자녀 상황을 멀리서 세심하게 파악','묵묵히 지원하는 든든한 존재감','감정적 충돌 없이 문제를 처리하는 능력'],
    cautions:['자녀가 "관심이 없나?" 오해할 수 있어요','도움을 주어도 전달이 안 되는 경우가 있어요','직접 말이 필요한 순간을 놓치기도 해요','자녀가 부모 마음을 추측해야 하는 부담'],
    tips:[{t:'마음은 행동만큼 말로도 표현해봐요',e:'"밥 챙겨놨어" 대신 "걱정됐어" 한마디'},{t:'정보보다 안부를 먼저 물어봐요',e:'"요즘 어때?" 먼저가 문을 열어줘요'},{t:'관찰한 것을 말로 옮겨봐요',e:'"요즘 좀 지쳐 보이더라"만으로도 충분해요'}],
    gauges:[{label:'공감 지향',val:55,color:'#5a9e6f'},{label:'해결 지향',val:72,color:'#c17f4a'},{label:'감정 표현',val:28,color:'#3d3530'},{label:'자율 존중',val:68,color:'#a09b95'}],
    compat:[{type:'논리형 자녀',badge:'good',desc:'둘 다 직접 감정 표현은 적지만 실용적 대화가 잘 통해요.'},{type:'내향형 자녀',badge:'mid',desc:'둘 다 조용해서 편하지만 소통이 너무 적어질 수 있어요.'},{type:'감수형 자녀',badge:'hard',desc:'자녀가 공감받고 싶어하는데 표현이 없어서 오해가 생겨요.'}],
    othersView:'차분하고 믿음직한 부모. 가끔 뭘 생각하는지 모르겠어.',myIntent:'섣불리 나서서 상황 망치기 싫어서 지켜보는 거예요.',
  };
  if(A<7&&C<6&&D<6) return {
    name:'공감형 부모',sub:'간접적 · 공감 중심 · 수용적',reliability:97,
    summary:'자녀의 감정을 먼저 헤아리고, 판단 없이 들어주는 것이 자연스러워요. 부드럽고 수용적이어서 자녀가 마음을 열기 쉬운 분위기를 만들어요.',
    strengths:['자녀가 마음을 열기 쉬운 분위기 형성','판단 없이 들어주는 능력','자녀의 감정 속도에 맞춰줄 수 있어요','"이 부모 앞에서는 솔직해도 된다"는 신뢰'],
    cautions:['결정이 필요한 순간 방향을 잡아주기 어려워요','자녀가 구체적인 가이드를 원할 때 아쉬워요','자신의 의견을 너무 억누를 수 있어요','지나친 수용이 자녀에게 불안감을 줄 수 있어요'],
    tips:[{t:'들어준 뒤에 내 생각도 살짝 말해봐요',e:'"나는 이렇게 생각하는데 네 생각은?"'},{t:'공감 이후 방향 힌트를 줘봐요',e:'"그랬구나. 혹시 이런 건 어때?"'},{t:'때로는 방향을 잡아주는 것도 사랑이에요',e:'아이는 가끔 이정표를 원해요'}],
    gauges:[{label:'공감 지향',val:92,color:'#5a9e6f'},{label:'해결 지향',val:28,color:'#c17f4a'},{label:'감정 표현',val:55,color:'#3d3530'},{label:'자율 존중',val:85,color:'#a09b95'}],
    compat:[{type:'내향형 자녀',badge:'good',desc:'자녀가 부담 없이 조금씩 열릴 수 있어요.'},{type:'감수형 자녀',badge:'good',desc:'감정을 알아봐주는 부모, 잘 맞아요.'},{type:'논리형 자녀',badge:'mid',desc:'자녀가 사실 중심을 원해요. 균형이 필요해요.'}],
    othersView:'따뜻하고 편안한 부모. 가끔 좀 더 방향을 잡아줬으면.',myIntent:'자녀가 편하게 말할 수 있는 사람이 되고 싶어요.',
  };
  if(B>=6&&D>=6&&A>=5) return {
    name:'코치형 부모',sub:'균형적 · 격려 중심 · 주도적',reliability:95,
    summary:'감정 표현과 목표 제시를 동시에 하는 편이에요. 자녀가 스스로 할 수 있다는 믿음을 주면서도 방향을 잃지 않게 함께하려 해요.',
    strengths:['감정 공감과 실용적 조언을 함께 제공','자녀의 가능성을 믿고 격려하는 능력','스스로 결정하도록 도우면서 곁에 있어요','유연하게 상황에 맞게 역할을 바꿔요'],
    cautions:['너무 많은 역할을 하려다 지칠 수 있어요','자녀가 독립을 원할 때 개입이 많게 느껴져요','코치 역할에 집중하다 순수한 공감이 부족해질 수 있어요','코칭인지 위로인지 먼저 물어봐요'],
    tips:[{t:'조언 전에 "어떤 도움이 필요해?" 물어봐요',e:'원하는 것을 확인하는 게 먼저예요'},{t:'성과보다 과정을 칭찬해줘요',e:'"결과가 아니라 시도 자체가 대단해"'},{t:'쉬는 날은 코치 말고 그냥 부모가 되어줘요',e:'목적 없이 함께하는 시간도 필요해요'}],
    gauges:[{label:'공감 지향',val:70,color:'#5a9e6f'},{label:'해결 지향',val:72,color:'#c17f4a'},{label:'감정 표현',val:75,color:'#3d3530'},{label:'자율 존중',val:65,color:'#a09b95'}],
    compat:[{type:'솔직형 자녀',badge:'good',desc:'격려를 잘 받아들이고 솔직하게 반응해요.'},{type:'논리형 자녀',badge:'good',desc:'목표 중심 대화가 잘 이뤄져요.'},{type:'내향형 자녀',badge:'mid',desc:'자녀가 부담을 느낄 수 있어요. 속도 조절이 필요해요.'}],
    othersView:'열정적이고 든든한 부모. 가끔 쉬지 못하게 하는 느낌.',myIntent:'이 아이가 자기 힘으로 해낼 수 있다고 믿어요.',
  };
  return {
    name:'중재형 부모',sub:'균형적 · 갈등 회피 · 조율 중심',reliability:93,
    summary:'갈등을 최소화하고 중간 지점을 찾으려는 성향이 강해요. 자녀와의 관계를 소중히 여기며 불필요한 마찰을 피하려 해요.',
    strengths:['갈등을 부드럽게 완화하는 능력','다양한 관점을 이해하고 조율','자녀와의 관계 유지를 최우선','상황에 맞게 유연하게 대응'],
    cautions:['명확한 입장이 없어 자녀가 혼란스러울 수 있어요','방향 제시가 부족할 수 있어요','갈등 회피가 해결을 미루는 결과를 낳기도 해요','내 의견을 표현하지 않다 보면 속으로 쌓여요'],
    tips:[{t:'때로는 명확한 입장을 표현해봐요',e:'"나는 이게 더 좋아"라고 말해도 괜찮아요'},{t:'조율하기 전에 내 감정부터 확인해요',e:'내 감정을 알아야 조율도 잘 돼요'},{t:'갈등을 피하는 것과 해결하는 건 달라요',e:'작은 불편함을 말하는 연습을 해봐요'}],
    gauges:[{label:'공감 지향',val:68,color:'#5a9e6f'},{label:'해결 지향',val:55,color:'#c17f4a'},{label:'감정 표현',val:50,color:'#3d3530'},{label:'자율 존중',val:72,color:'#a09b95'}],
    compat:[{type:'솔직형 자녀',badge:'mid',desc:'자녀의 직접 표현에 때로 부담을 느끼지만 균형점을 찾을 수 있어요.'},{type:'내향형 자녀',badge:'good',desc:'둘 다 갈등을 피하는 편이라 안정적이에요.'},{type:'감수형 자녀',badge:'mid',desc:'서로 감정 표현이 적어요. 먼저 말 거는 연습이 필요해요.'}],
    othersView:'무난하고 편안한 부모. 가끔 부모 생각이 뭔지 알고 싶어.',myIntent:'싸우기 싫어요. 사이좋게 지내는 게 제일 중요해요.',
  };
}

/* ─── 자녀 6유형 ─── */
function getChildType(s){
  const {A,B,C,D}=s;
  if(A>=7&&B>=7) return {
    name:'솔직형',sub:'직접적 · 감정 표현 · 주체적',reliability:97,
    summary:'생각과 감정을 솔직하게 표현하는 편이에요. 부모님과도 할 말은 하고, 감정도 티가 나요.',
    strengths:['부모님이 내 상태를 비교적 잘 알 수 있어요','갈등이 생겨도 빠르게 터놓고 해결해요','솔직함이 장기적으로 신뢰를 만들어요','감정을 쌓아두지 않아서 관계가 맑아요'],
    cautions:['감정이 강할 때 표현이 거칠어질 수 있어요','말하고 나서 후회할 때가 있어요','상대 감정을 고려하지 못할 때가 있어요','받아들일 준비가 됐는지 먼저 보는 연습'],
    tips:[{t:'말하기 전에 2초만 생각해봐요',e:'감정이 식은 뒤 말하면 더 잘 전달돼요'},{t:'"나는 ~했어요" 형식으로 말해봐요',e:'비난 대신 내 감정으로 전달하면 덜 싸워요'},{t:'솔직함은 강점이에요, 표현만 다듬으면 돼요',e:'내용은 그대로, 포장만 살짝 바꿔요'}],
    gauges:[{label:'공감 지향',val:55,color:'#5a9e6f'},{label:'자기표현',val:92,color:'#c17f4a'},{label:'직접성',val:88,color:'#3d3530'},{label:'자율성',val:75,color:'#a09b95'}],
    compat:[{type:'공감형 부모',badge:'good',desc:'판단 없이 들어줘서 솔직함이 더 잘 발휘돼요.'},{type:'표현형 부모',badge:'mid',desc:'둘 다 직접적이어서 빠르게 연결되지만 충돌도 잦아요.'},{type:'지휘형 부모',badge:'hard',desc:'둘 다 강한 편이라 충돌 강도가 높아요.'}],
    othersView:'뭘 생각하는지 알 수 있는 아이. 가끔 좀 세게 느껴질 때 있어.',myIntent:'숨기고 싶지 않아요. 솔직하게 대하는 게 편해요.',
  };
  if(A>=7&&B<6&&C>=6) return {
    name:'논리형',sub:'직접적 · 감정 억제 · 해결 지향',reliability:95,
    summary:'말은 직접적으로 하지만 감정보다는 사실이나 논리 위주로 표현해요.',
    strengths:['말하고 싶은 것을 명확하게 전달해요','감정에 휩쓸리지 않고 이성적으로 대화','논리적 설명 능력이 뛰어나요','문제 해결에 집중해서 생산적인 대화'],
    cautions:['부모님이 "감정이 없나" 오해할 수 있어요','자신의 감정을 알아채는 연습이 필요해요','논리를 앞세울 때 관계가 멀어질 수 있어요','부모님의 감정 표현이 비효율적으로 느껴질 수 있어요'],
    tips:[{t:'이유 말고 감정도 한 마디 추가해봐요',e:'"그래서 좀 속상했어요" 한마디면 충분해요'},{t:'부모님의 감정 표현을 이상하다 여기지 마요',e:'표현 방식이 다를 뿐이에요'},{t:'감정 표현이 약점이 아니에요',e:'논리와 감정 둘 다 있어야 대화가 완성돼요'}],
    gauges:[{label:'공감 지향',val:40,color:'#5a9e6f'},{label:'자기표현',val:42,color:'#c17f4a'},{label:'직접성',val:85,color:'#3d3530'},{label:'자율성',val:70,color:'#a09b95'}],
    compat:[{type:'관찰형 부모',badge:'good',desc:'둘 다 직접 감정 표현은 적지만 실용적 대화가 잘 통해요.'},{type:'코치형 부모',badge:'good',desc:'목표 중심 대화가 잘 맞아요.'},{type:'표현형 부모',badge:'hard',desc:'부모님의 감정 중심 대화에 피로감을 느낄 수 있어요.'}],
    othersView:'똑부러지고 명확한 아이. 속마음이 뭔지 잘 모르겠어.',myIntent:'감정보다 사실이 중요해요. 효율적으로 해결하고 싶어요.',
  };
  if(A<6&&B>=7) return {
    name:'감수형',sub:'간접적 · 감정 풍부 · 눈치형',reliability:96,
    summary:'감정은 풍부하게 느끼지만, 말로 표현하기보다는 태도나 표정으로 티가 나는 편이에요.',
    strengths:['감정에 민감하고 공감 능력이 높아요','분위기를 잘 읽어요','깊이 느끼는 만큼 관계에 진심이에요','섬세한 관찰로 상대를 잘 이해해요'],
    cautions:['태도로 티를 내지만 부모님이 이유를 모를 수 있어요','"알아서 알아줘"가 갈등을 만들기도 해요','말로 표현하지 않으면 오해가 쌓여요','혼자 감당하려다 지칠 수 있어요'],
    tips:[{t:'태도 대신 말로 한 번 시도해봐요',e:'"오늘 좀 힘들었어요" 한마디가 훨씬 빨라요'},{t:'완벽한 표현이 아니어도 괜찮아요',e:'"뭐라 말하기 어려운데 힘들어요"도 충분해요'},{t:'내 감정에 이름을 붙여봐요',e:'슬픔인지, 지침인지, 외로움인지 구분해봐요'}],
    gauges:[{label:'공감 지향',val:78,color:'#5a9e6f'},{label:'자기표현',val:72,color:'#c17f4a'},{label:'직접성',val:28,color:'#3d3530'},{label:'자율성',val:58,color:'#a09b95'}],
    compat:[{type:'표현형 부모',badge:'good',desc:'감정을 중요하게 여기는 공통점. 서로 알아봐줄 수 있어요.'},{type:'공감형 부모',badge:'good',desc:'판단 없이 들어줘서 조금씩 말을 꺼낼 수 있어요.'},{type:'지휘형 부모',badge:'hard',desc:'빠른 해결 지향이 감정을 무시하는 것처럼 느껴질 수 있어요.'}],
    othersView:'감수성이 풍부한 아이. 왜 갑자기 저러는지 모를 때가 있어.',myIntent:'알아줬으면 해요. 말하기 어려울 뿐이에요.',
  };
  if(A<6&&B<6) return {
    name:'내향형',sub:'간접적 · 감정 억제 · 독립 지향',reliability:94,
    summary:'감정도 말도 안으로 삭이는 편이에요. 혼자 처리하는 게 익숙하고, 부모님과의 대화가 부담스럽게 느껴질 때가 많아요.',
    strengths:['혼자서 감정을 정리하는 능력','신중하게 생각하고 행동해요','불필요한 갈등을 피하는 편이에요','독립적으로 문제를 해결하는 능력'],
    cautions:['부모님이 내 상태를 전혀 모를 수 있어요','혼자 감당하다 한 번에 터지기도 해요','도움이 필요할 때 표현 못 하는 경우가 생겨요','고립감이 쌓이면 관계가 더 멀어질 수 있어요'],
    tips:[{t:'한 문장짜리 체크인만 해도 충분해요',e:'"오늘 좀 지쳤어요" 그것만으로도 관계가 달라져요'},{t:'말이 아닌 다른 방식도 OK예요',e:'문자, 앱 체크인 등 간접 표현도 충분해요'},{t:'혼자 삭이는 게 미덕이 아니에요',e:'조금씩 표현할수록 마음이 가벼워져요'}],
    gauges:[{label:'공감 지향',val:60,color:'#5a9e6f'},{label:'자기표현',val:22,color:'#c17f4a'},{label:'직접성',val:25,color:'#3d3530'},{label:'자율성',val:85,color:'#a09b95'}],
    compat:[{type:'공감형 부모',badge:'good',desc:'강요하지 않아서 조금씩 열릴 수 있어요.'},{type:'관찰형 부모',badge:'mid',desc:'둘 다 조용해서 편하지만 소통이 너무 없어질 수 있어요.'},{type:'지휘형 부모',badge:'hard',desc:'직접적 접근에 완전히 닫혀버릴 수 있어요.'}],
    othersView:'조용하고 독립적인 아이. 뭘 생각하는지 도무지 모르겠어.',myIntent:'부담주고 싶지 않아요. 괜찮으면 혼자 해결하는 게 편해요.',
  };
  if(A>=6&&D>=7&&C>=6) return {
    name:'주도형',sub:'직접적 · 자기주도 · 해결 지향',reliability:95,
    summary:'자기 의견이 명확하고 스스로 결정하고 싶은 욕구가 강해요.',
    strengths:['명확한 자기 의견과 방향','자율적으로 문제를 해결하는 능력','의존 없이 스스로 결정하는 힘','목표 지향적이고 실행력이 강해요'],
    cautions:['부모님 의견을 무시하는 것처럼 보일 수 있어요','도움이 필요할 때도 요청하기 어려워해요','고집처럼 보여 관계에 마찰이 생길 수 있어요','틀렸을 때 인정하는 것이 어렵게 느껴질 수 있어요'],
    tips:[{t:'부모님 의견도 "참고 자료"로 열어둬봐요',e:'반드시 따를 필요는 없지만 들어보는 것도 힘이에요'},{t:'도움 요청이 약함이 아니에요',e:'"도움이 필요해요"라고 말해봐요'},{t:'내 결정을 설명해줄 때 이유도 함께요',e:'부모님도 이해하면 더 지지해줄 수 있어요'}],
    gauges:[{label:'공감 지향',val:45,color:'#5a9e6f'},{label:'자기표현',val:75,color:'#c17f4a'},{label:'직접성',val:82,color:'#3d3530'},{label:'자율성',val:92,color:'#a09b95'}],
    compat:[{type:'공감형 부모',badge:'good',desc:'판단 않고 지지해줘서 자율성이 존중받는 느낌이에요.'},{type:'코치형 부모',badge:'mid',desc:'함께 목표를 만들면 잘 맞지만 개입이 많으면 충돌해요.'},{type:'지휘형 부모',badge:'hard',desc:'둘 다 주도권을 원해서 정면 충돌이 잦아요.'}],
    othersView:'뚜렷하고 주관 있는 아이. 가끔 말이 안 통하는 것 같아서 답답해.',myIntent:'내가 직접 해야 제대로 된다고 생각해요. 믿어줬으면 해요.',
  };
  return {
    name:'수용형',sub:'간접적 · 수용적 · 관계 중심',reliability:93,
    summary:'갈등을 피하고 관계를 유지하는 것을 중요하게 생각해요. 부드럽고 유연하지만, 내 진짜 생각이 전달되지 않는 경우가 있어요.',
    strengths:['갈등 없이 관계를 유지하는 능력','부모님의 말을 잘 수용하고 유연하게 반응','분위기를 잘 읽고 맞춰줄 수 있어요','평화로운 가족 분위기에 기여해요'],
    cautions:['내 진짜 생각이 전달되지 않아 오해가 생겨요','속으로 쌓여서 갑자기 터질 수 있어요','내 의견이 없어 보여 부모님도 답답할 수 있어요','맞춰주는 것이 습관이 되면 내 것을 잃을 수 있어요'],
    tips:[{t:'작은 것부터 내 의견을 말해봐요',e:'"저는 이게 더 좋아요"라고 말해도 괜찮아요'},{t:'동의와 진짜 생각을 구분해봐요',e:'맞춰주는 것과 진심 동의는 달라요'},{t:'갈등이 나쁜 게 아니에요',e:'작은 불편함을 말하면 관계가 더 진솔해져요'}],
    gauges:[{label:'공감 지향',val:80,color:'#5a9e6f'},{label:'자기표현',val:35,color:'#c17f4a'},{label:'직접성',val:28,color:'#3d3530'},{label:'자율성',val:32,color:'#a09b95'}],
    compat:[{type:'표현형 부모',badge:'mid',desc:'처음엔 부담스럽지만 익숙해지면 안심이 돼요.'},{type:'공감형 부모',badge:'good',desc:'서로 부드럽고 수용적이어서 평화로운 관계예요.'},{type:'중재형 부모',badge:'good',desc:'둘 다 갈등을 피하지만, 의식적으로 더 열어봐요.'}],
    othersView:'순하고 착한 아이. 가끔 진짜 뭘 원하는지 알고 싶어.',myIntent:'싸우기 싫어요. 사이좋게 지내는 게 더 중요해요.',
  };
}

/* ══════════════════════════════════════════════════════
   퀴즈 엔진
══════════════════════════════════════════════════════ */
let radarChart = null;

const Quiz = (() => {
  let qs=[]; let role=''; let cur=0; let ans={};

  function show(id){
    document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
    const el = document.getElementById(id);
    if(el) { el.classList.add('active'); window.scrollTo(0,0); }
  }

  function calcScores(){
    const raw={A:0,B:0,C:0,D:0}; const cnt={A:0,B:0,C:0,D:0};
    qs.forEach((q,i)=>{ if(ans[i]!==undefined){ raw[q.axis]+=ans[i]; cnt[q.axis]++; } });
    const out={};
    Object.keys(raw).forEach(k=>{
      const max=cnt[k]*4;
      out[k]=max>0?Math.round((raw[k]/max)*10):5;
    });
    return out;
  }

  function renderQ(){
    const q=qs[cur]; const tot=qs.length;
    document.getElementById('q-prog-text').textContent=`${cur+1} / ${tot}`;
    document.getElementById('q-axis-pill').textContent=q.tag;
    document.getElementById('q-prog-bar').style.width=`${((cur+1)/tot)*100}%`;
    document.getElementById('q-num').textContent=`질문 ${String(cur+1).padStart(2,'0')}`;
    document.getElementById('q-text').textContent=q.q;

    document.getElementById('q-opts').innerHTML=q.opts.map((o,i)=>{
      const sel=ans[cur]===o.s?'selected':'';
      return `<button class="opt ${sel}" onclick="Quiz.select(${o.s},this)">
        <span class="opt-num">${i+1}</span><span>${o.t}</span>
      </button>`;
    }).join('');

    document.getElementById('btn-prev').disabled=cur===0;
    document.getElementById('btn-next').disabled=ans[cur]===undefined;
    document.getElementById('btn-next').textContent=cur===tot-1?'결과 보기':'다음';
  }

  function renderResult(){
    const scores=calcScores();
    const type=role==='parent'?getParentType(scores):getChildType(scores);

    // ★ 결과 저장 — localStorage + Firestore
    const saved={
      role, type:type.name, sub:type.sub,
      scores, reliability:type.reliability,
      date:new Date().toLocaleDateString('ko-KR'),
      savedAt: new Date().toISOString(),
    };
    // localStorage에 저장 (앱에서 활용)
    localStorage.setItem('kync_quiz_result', JSON.stringify(saved));

    // Firestore에도 저장
    const uid = (typeof KyncAuth !== 'undefined') ? KyncAuth.current?.uid : null;
    if (uid && typeof KyncDB !== 'undefined') {
      KyncDB.saveQuizResult(uid, saved).catch(e => console.error('quiz save', e));
    }

    document.getElementById('r-eyebrow').textContent=role==='parent'?'부모 대화 유형 분석':'수험생 대화 유형 분석';
    document.getElementById('r-type-name').textContent=type.name;
    document.getElementById('r-type-sub').textContent=type.sub;
    document.getElementById('r-reliability').textContent=`AI 신뢰도 ${type.reliability}%`;
    document.getElementById('r-summary').textContent=type.summary;

    show('s-result');

    /* 레이더 차트 */
    setTimeout(()=>{
      const ctx=document.getElementById('radarChart').getContext('2d');
      if(radarChart) radarChart.destroy();
      radarChart=new Chart(ctx,{
        type:'radar',
        data:{
          labels:['직접성','감정표현','해결지향','주도성'],
          datasets:[{
            label:'나의 점수',
            data:[scores.A,scores.B,scores.C,scores.D],
            backgroundColor:'rgba(193,127,74,0.15)',
            borderColor:'#c17f4a',
            pointBackgroundColor:'#c17f4a',
            pointRadius:5,
            borderWidth:2,
          }]
        },
        options:{
          responsive:true,
          maintainAspectRatio:false,
          scales:{r:{min:0,max:10,ticks:{stepSize:2,color:'#a09b95',font:{size:10,family:'Nunito'}},pointLabels:{color:'#3d3530',font:{size:12,weight:'700',family:'Nunito'}},grid:{color:'rgba(0,0,0,0.06)'},angleLines:{color:'rgba(0,0,0,0.06)'}}},
          plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.raw}/10점`}}},
        }
      });

      /* 축 점수 바 */
      document.getElementById('axes-display').innerHTML=AXES.map(ax=>{
        const pct=(scores[ax.id]/10)*100;
        return `<div class="axis-row">
          <div class="axis-top"><span>${ax.lo}</span><span class="axis-center-name">${ax.name}</span><span>${ax.hi}</span></div>
          <div class="axis-bg"><div class="axis-fill" style="width:0%" data-pct="${pct}"></div></div>
          <div class="axis-score-row"><div class="axis-score">${scores[ax.id]} / 10</div></div>
        </div>`;
      }).join('');
      setTimeout(()=>{ document.querySelectorAll('.axis-fill').forEach(el=>{ el.style.width=el.dataset.pct+'%'; }); },100);

      /* 게이지 */
      document.getElementById('gauge-display').innerHTML=type.gauges.map(g=>`
        <div class="gauge-row">
          <div class="gauge-label">${g.label}</div>
          <div class="gauge-bg"><div class="gauge-fill" style="width:0%;background:${g.color}" data-val="${g.val}"></div></div>
          <div class="gauge-val" style="color:${g.color}">${g.val}</div>
        </div>`).join('');
      setTimeout(()=>{ document.querySelectorAll('.gauge-fill').forEach(el=>{ el.style.width=el.dataset.val+'%'; }); },200);

      /* 상세 */
      document.getElementById('r-detail-card').innerHTML=`
        <div class="detail-section">
          <div class="detail-title">강점</div>
          ${type.strengths.map(t=>`<div class="detail-item"><span class="detail-dash">—</span>${t}</div>`).join('')}
        </div>
        <div class="detail-section">
          <div class="detail-title">주의할 점</div>
          ${type.cautions.map(t=>`<div class="detail-item"><span class="detail-dash">—</span>${t}</div>`).join('')}
        </div>
        <div class="detail-section">
          <div class="detail-title">상대방이 보는 나</div>
          <div style="font-size:14px;color:var(--text2);line-height:1.7;padding:8px 0;">${type.othersView}</div>
        </div>
        <div class="detail-section" style="margin-bottom:0;">
          <div class="detail-title">나의 진심</div>
          <div style="font-size:14px;color:var(--text2);line-height:1.7;padding:8px 0;">${type.myIntent}</div>
        </div>`;

      /* 팁 */
      document.getElementById('r-tips').innerHTML=type.tips.map(t=>`<div class="tip-item">${t.t}<em>${t.e}</em></div>`).join('');

      /* 궁합 */
      document.getElementById('r-compat').innerHTML=type.compat.map(c=>{
        const cls=c.badge==='good'?'badge-good':c.badge==='mid'?'badge-mid':'badge-hard';
        const lbl=c.badge==='good'?'잘 맞아요':c.badge==='mid'?'노력 필요':'도전적';
        return `<div class="compat-item">
          <div class="compat-badge ${cls}">${lbl}</div>
          <div class="compat-text"><strong>${c.type}</strong>${c.desc}</div>
        </div>`;
      }).join('');
    },100);
  }

  /* 로딩 연출 */
  function runLoading(){
    show('s-loading');
    const msgs=['4개 축의 응답 데이터를 처리 중...','대화 패턴과 감정 성향을 분석 중...','6가지 유형과 비교 대조 중...','정밀 분석 리포트를 생성 중...'];
    let i=0;
    const msgEl=document.getElementById('loading-msg');
    const timer=setInterval(()=>{ if(i<msgs.length){ if(msgEl) msgEl.textContent=msgs[i++]; } else { clearInterval(timer); renderResult(); } },700);
  }

  return {
    start(r){
      role=r; qs=r==='parent'?PARENT_QS:CHILD_QS; cur=0; ans={};
      renderQ(); show('s-quiz');
    },
    select(score,btn){
      ans[cur]=score;
      document.querySelectorAll('.opt').forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected');
      document.getElementById('btn-next').disabled=false;
    },
    prev(){ if(cur>0){ cur--; renderQ(); } },
    next(){
      if(ans[cur]===undefined) return;
      if(cur<qs.length-1){ cur++; renderQ(); }
      else runLoading();
    },
    reset(){ show('s-role'); radarChart&&radarChart.destroy(); radarChart=null; },
    // ★ 나가기 → 활동 탭으로 이동
    saveAndGoHome(){
      const role = localStorage.getItem('kync_role') || 'parent';
      const activityTab = role === 'parent' ? 'p-activityTab' : 'c-activityTab';
      location.href = `index.html?tab=${activityTab}&role=${role}`;
    },
  };
})(); 