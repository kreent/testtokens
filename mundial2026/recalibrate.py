"""
Recalibración del modelo - tras Jornada 3 completa de fase de grupos
====================================================================
Actualiza ELO con TODOS los resultados reales (J1+J2+J3) usando
actualización online, evalúa accuracy retrospectiva, y recorre
el Monte Carlo de la fase eliminatoria.
Datos finales al: 24-25 junio 2026
"""

import sys, json
import numpy as np
sys.path.insert(0, "mundial2026")
from model import ELO_RATINGS, GROUPS, predict_match, elo_win_prob

np.random.seed(42)

# Resultados REALES completos de la fase de grupos (los disponibles/verificados)
# (local, visitante, goles_local, goles_visitante, jornada)
RESULTS_FINAL = [
    # ----- Grupo A -----
    ("Mexico", "South Africa", 2, 0, 1),
    ("South Korea", "Czech Republic", 2, 1, 1),      # Corea ganó (corregido)
    ("Mexico", "South Korea", 1, 0, 2),
    ("Czech Republic", "South Africa", 1, 1, 2),
    ("South Korea", "South Africa", 2, 1, 3),         # J3
    ("Mexico", "Czech Republic", 3, 0, 3),            # J3
    # ----- Grupo B -----
    ("Canada", "Bosnia-Herzegovina", 1, 1, 1),
    ("Switzerland", "Qatar", 1, 1, 1),
    ("Switzerland", "Bosnia-Herzegovina", 4, 1, 2),
    ("Canada", "Qatar", 6, 0, 2),
    ("Switzerland", "Canada", 2, 1, 3),               # J3
    ("Bosnia-Herzegovina", "Qatar", 3, 1, 3),         # J3
    # ----- Grupo C (Brasil/Marruecos/Escocia/Haití) -----
    ("Brazil", "Morocco", 1, 1, 1),
    ("Scotland", "Haiti", 1, 0, 1),
    ("Brazil", "Haiti", 3, 0, 2),
    ("Morocco", "Scotland", 1, 0, 2),
    ("Brazil", "Scotland", 3, 0, 3),                  # J3
    ("Morocco", "Haiti", 4, 2, 3),                    # J3
    # ----- Grupo E (datos parciales conocidos) -----
    ("USA", "Paraguay", 4, 1, 1),
    ("USA", "Australia", 2, 0, 2),
    ("Australia", "Turkey", 2, 0, 1),
    ("Paraguay", "Turkey", 1, 0, 2),
    # ----- Grupo F (Alemania) -----
    ("Germany", "Curacao", 7, 1, 1),
    ("Germany", "Ivory Coast", 2, 1, 2),
    ("Ivory Coast", "Ecuador", 1, 0, 1),
    ("Ecuador", "Curacao", 0, 0, 2),
    # ----- Grupo otros (Holanda/Japón) -----
    ("Netherlands", "Japan", 2, 2, 1),
    ("Netherlands", "Sweden", 5, 1, 2),
    ("Sweden", "Tunisia", 5, 1, 1),
    ("Japan", "Tunisia", 4, 0, 2),
    ("Belgium", "Egypt", 1, 1, 1),
    ("Iran", "New Zealand", 2, 2, 1),
    ("Spain", "Cape Verde", 0, 0, 1),
    ("Uruguay", "Saudi Arabia", 1, 1, 1),
    ("England", "Ghana", 2, 0, 1),
]

def recalibrate_elo(base_elo, results, K=40):
    """Actualización ELO online con margen de victoria (Goal-Difference scaling)."""
    elo = dict(base_elo)
    for ta, tb, ga, gb, _ in results:
        ea = elo.get(ta, 1600)
        eb = elo.get(tb, 1600)
        exp_a = 1 / (1 + 10 ** ((eb - ea) / 400))
        actual_a = 1 if ga > gb else (0.5 if ga == gb else 0)
        # multiplicador por margen de gol (estilo World Football Elo)
        margin = abs(ga - gb)
        mult = 1.0 if margin <= 1 else (1.5 if margin == 2 else (1.75 + (margin - 3) / 8))
        delta = K * mult * (actual_a - exp_a)
        elo[ta] = ea + delta
        elo[tb] = eb - delta
    return elo


def evaluate_accuracy(base_elo, results):
    """Accuracy y log-loss de los resultados con el ELO previo a J3."""
    correct, losses = 0, []
    j3 = [r for r in results if r[4] == 3]
    for ta, tb, ga, gb, _ in j3:
        p_w, p_d, p_l = elo_win_prob(base_elo.get(ta,1600), base_elo.get(tb,1600))
        pred = "W" if p_w>=p_d and p_w>=p_l else ("D" if p_d>=p_l else "L")
        real = "W" if ga>gb else ("D" if ga==gb else "L")
        if pred == real: correct += 1
        ll = -np.log(max({"W":p_w,"D":p_d,"L":p_l}[real], 1e-10))
        losses.append(ll)
    return correct, len(j3), np.mean(losses)


print("="*66)
print("  RECALIBRACIÓN DEL MODELO - tras Jornada 3 completa")
print("="*66)

# Accuracy retrospectiva de la jornada 3
corr, total, ll = evaluate_accuracy(ELO_RATINGS, RESULTS_FINAL)
print(f"\n=== EVALUACIÓN JORNADA 3 (pronóstico previo vs real) ===")
print(f"  Aciertos de resultado (1X2): {corr}/{total}  ({corr/total*100:.0f}%)")
print(f"  Log-loss jornada 3:          {ll:.4f}  (azar={-np.log(1/3):.4f})")

# Recalibrar
ELO_NEW = recalibrate_elo(ELO_RATINGS, RESULTS_FINAL)

print(f"\n=== CAMBIOS DE ELO (selecciones que más se movieron) ===")
deltas = {t: ELO_NEW[t]-ELO_RATINGS[t] for t in ELO_RATINGS}
for t, d in sorted(deltas.items(), key=lambda x: abs(x[1]), reverse=True)[:14]:
    arrow = "▲" if d>0 else "▼"
    print(f"  {t:<22} {ELO_RATINGS[t]:>6.0f} → {ELO_NEW[t]:>6.0f}  {arrow}{abs(d):>5.1f}")

# Guardar ELO recalibrado
with open("mundial2026/elo_recalibrated.json","w") as f:
    json.dump({t: round(v,1) for t,v in ELO_NEW.items()}, f, indent=2, ensure_ascii=False)

# Comparar pronóstico de campeón ANTES vs DESPUÉS (Monte Carlo)
from model import simulate_tournament

def mc_champion(elo, n=8000):
    known = {(a,b):(ga,gb) for a,b,ga,gb,_ in RESULTS_FINAL}
    cnt = {}
    for _ in range(n):
        w = simulate_tournament(elo, GROUPS, known)
        cnt[w] = cnt.get(w,0)+1
    return dict(sorted({k:round(v/n*100,2) for k,v in cnt.items()}.items(),
                       key=lambda x:x[1], reverse=True))

print("\n=== PRONÓSTICO DE CAMPEÓN: antes vs después de recalibrar ===")
print("  (Monte Carlo 8,000 simulaciones)")
before = mc_champion(ELO_RATINGS)
after  = mc_champion(ELO_NEW)
teams = list(dict.fromkeys(list(before)[:12] + list(after)[:12]))
print(f"  {'Equipo':<20}{'Antes':>9}{'Después':>10}{'Δ':>9}")
print("  "+"-"*48)
for t in sorted(teams, key=lambda x: after.get(x,0), reverse=True)[:12]:
    b = before.get(t,0); a = after.get(t,0)
    print(f"  {t:<20}{b:>8.2f}%{a:>9.2f}%{a-b:>+8.2f}")

with open("mundial2026/results_recalibrated.json","w") as f:
    json.dump({"date":"2026-06-25","j3_accuracy":f"{corr}/{total}",
               "j3_logloss":round(ll,4),
               "champion_after":dict(list(after.items())[:15])}, f, indent=2, ensure_ascii=False)

print("\n  Archivos: elo_recalibrated.json + results_recalibrated.json")
print("="*66)
