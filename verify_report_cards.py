# Python script to calculate exact report card averages from the images

report_1_subjects = [
    # (name, coef, interr, dev, compo)
    ("Catéchèse", 1.0, 9.50, 14.00, 14.50),
    ("Français", 2.0, 10.00, 10.00, 8.00),
    ("Anglais", 2.0, 17.00, 16.00, 17.00),
    ("Histo-Géo", 2.0, 12.00, 13.00, 12.00),
    ("ECM", 2.0, 15.00, 15.00, 15.00),
    ("Philosophie", 1.0, None, None, 12.00),
    ("Mathématiques", 4.0, 6.00, 4.00, 4.00),
    ("Sciences Physiques", 3.0, 5.00, 3.00, 2.00),
    ("SVT", 3.0, 17.00, 14.00, 12.00),
    ("Dessin", 1.0, 17.00, 17.00, 17.00),
    ("Musique", 1.0, 19.00, 19.00, 18.00),
    ("EPS", 1.0, None, 11.00, 11.00),
    ("Allemand*", 1.0, 13.00, 10.00, 11.00),
]

report_2_subjects = [
    ("Catéchèse", 1.0, 19.50, 20.00, 14.50),
    ("Français", 2.0, 15.00, 13.00, 12.00),
    ("Anglais", 2.0, 17.00, 17.00, 17.00),
    ("Histo-Géo", 2.0, 9.00, 15.00, 16.00),
    ("ECM", 2.0, 16.00, 15.00, 17.00),
    ("Philosophie", 1.0, 10.00, 12.00, 11.00),
    ("Mathématiques", 4.0, 4.00, 10.00, 7.00),
    ("Sciences Physiques", 3.0, 10.00, 8.00, 7.00),
    ("SVT", 3.0, 12.00, 18.00, 18.00),
    ("Dessin", 1.0, 11.00, 13.50, 16.00),
    ("Musique", 1.0, 10.00, 19.00, 19.00),
    ("EPS", 1.0, None, 15.00, 18.00),
    ("Allemand*", 1.0, 11.00, 16.00, 14.00),
]

def process_report(title, subjects):
    print(f"=== {title} ===")
    total_points = 0
    total_coef = 0

    for name, coef, interr, dev, compo in subjects:
        classwork = []
        if interr is not None: classwork.append(interr)
        if dev is not None: classwork.append(dev)
        
        moy_classe = sum(classwork)/len(classwork) if classwork else None
        
        if moy_classe is not None and compo is not None:
            moy_sem = (moy_classe + compo) / 2
        elif moy_classe is not None:
            moy_sem = moy_classe
        else:
            moy_sem = compo
            
        moy_coef = moy_sem * coef
        total_points += moy_coef
        total_coef += coef
        
        print(f"{name:20s} | Coef: {coef:3.1f} | Moy.classe: {moy_classe if moy_classe is not None else 0:5.2f} | Compo: {compo:5.2f} | Moy.sem: {moy_sem:5.2f} | Moy.Coef: {moy_coef:6.2f}")

    gen_avg = total_points / total_coef
    print("-" * 75)
    print(f"TOTAL COEF: {total_coef} | TOTAL POINTS: {total_points:.2f} | MOYENNE GENERALE: {gen_avg:.4f} / 20 ({gen_avg:.2f}/20)")
    print()

process_report("REPORT CARD 1 (Semester 1)", report_1_subjects)
process_report("REPORT CARD 2 (Semester 2)", report_2_subjects)
