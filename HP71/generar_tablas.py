import os
import csv

OUTPUT_PATH = r"C:\Users\dolfo\Documents\hp71_emulator\tables\tables.csv"

os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)


def write_row(writer, art, proj, chg, dist, qe, tof, drift):
    writer.writerow([
        int(art),
        str(proj),
        int(chg),
        int(round(dist)),
        round(float(qe), 1),
        round(float(tof), 4),
        round(float(drift), 4)
    ])


def add_table_block(
    writer,
    art,
    proj,
    chg,
    dmin,
    dmax,
    step,
    base_scale,
    chg_scale,
    curve_scale,
    tof_scale,
    drift_scale,
    power=1.0,
    qe_bias=0.0,
    tof_bias=0.0,
    drift_bias=0.0
):
    """
    Generador provisional refinado.

    IMPORTANTE:
    Esto NO es tabla oficial.
    Es una tabla empirica provisional para que el emulador tenga:
    - mas puntos de interpolacion
    - mejor comportamiento por carga
    - seleccion de carga mas parecida a la esperada

    power > 1.0:
        proyectil/carga mas potente.
        Para la misma distancia baja QE y TOF.

    power < 1.0:
        proyectil/carga menos potente.
        Para la misma distancia sube QE y TOF.
    """

    for d in range(dmin, dmax + 1, step):
        km = d / 1000.0

        qe = ((base_scale * km) + (curve_scale * km * km) + (chg * chg_scale)) / power
        qe += qe_bias

        tof = (d / (tof_scale * power)) + (chg * 0.16) + tof_bias

        drift = ((d / 10000.0) * chg * drift_scale) + drift_bias

        write_row(writer, art, proj, chg, d, qe, tof, drift)


def add_105_family(writer):
    """
    105 mm.
    Aqui SI dejamos CHG 4.

    105 HE:
        base provisional.

    105 M1:
        parecido a HE.

    105 M67:
        parecido a HE por ahora.

    105 HEA:
        mas potente que HE.

    105 ILA:
        menos potente / mas lento provisional.
    """

    # ==================================================
    # 105 HE / M1 / M67
    # CHG 4, 5, 6, 7
    # ==================================================

    for proj in ["HE", "M1", "M67"]:
        add_table_block(
            writer, 105, proj, 4,
            1000, 6000, 100,
            base_scale=38.0,
            chg_scale=10.5,
            curve_scale=0.42,
            tof_scale=285.0,
            drift_scale=1.00,
            power=1.00
        )

        add_table_block(
            writer, 105, proj, 5,
            1500, 7500, 100,
            base_scale=38.0,
            chg_scale=10.5,
            curve_scale=0.42,
            tof_scale=285.0,
            drift_scale=1.00,
            power=1.00
        )

        add_table_block(
            writer, 105, proj, 6,
            2000, 9000, 100,
            base_scale=38.0,
            chg_scale=10.5,
            curve_scale=0.42,
            tof_scale=285.0,
            drift_scale=1.00,
            power=1.00
        )

        add_table_block(
            writer, 105, proj, 7,
            3000, 10000, 100,
            base_scale=38.0,
            chg_scale=10.5,
            curve_scale=0.42,
            tof_scale=285.0,
            drift_scale=1.00,
            power=1.00
        )

    # ==================================================
    # 105 HEA
    # CHG 4, 5, 6, 7
    # Mas potente que HE.
    # ==================================================

    add_table_block(
        writer, 105, "HEA", 4,
        1000, 7000, 100,
        base_scale=38.0,
        chg_scale=10.5,
        curve_scale=0.42,
        tof_scale=285.0,
        drift_scale=0.96,
        power=1.06,
        qe_bias=-2.0,
        tof_bias=-0.10
    )

    add_table_block(
        writer, 105, "HEA", 5,
        1500, 8500, 100,
        base_scale=38.0,
        chg_scale=10.5,
        curve_scale=0.42,
        tof_scale=285.0,
        drift_scale=0.96,
        power=1.06,
        qe_bias=-2.0,
        tof_bias=-0.10
    )

    add_table_block(
        writer, 105, "HEA", 6,
        2000, 10000, 100,
        base_scale=38.0,
        chg_scale=10.5,
        curve_scale=0.42,
        tof_scale=285.0,
        drift_scale=0.96,
        power=1.06,
        qe_bias=-2.0,
        tof_bias=-0.10
    )

    add_table_block(
        writer, 105, "HEA", 7,
        3000, 11500, 100,
        base_scale=38.0,
        chg_scale=10.5,
        curve_scale=0.42,
        tof_scale=285.0,
        drift_scale=0.96,
        power=1.06,
        qe_bias=-2.0,
        tof_bias=-0.10
    )

    # ==================================================
    # 105 ILA
    # CHG 4, 5, 6, 7
    # Menos potente / mas lento provisional.
    # ==================================================

    add_table_block(
        writer, 105, "ILA", 4,
        1000, 5000, 100,
        base_scale=38.0,
        chg_scale=10.5,
        curve_scale=0.42,
        tof_scale=285.0,
        drift_scale=1.04,
        power=0.96,
        qe_bias=3.0,
        tof_bias=0.10
    )

    add_table_block(
        writer, 105, "ILA", 5,
        1500, 6500, 100,
        base_scale=38.0,
        chg_scale=10.5,
        curve_scale=0.42,
        tof_scale=285.0,
        drift_scale=1.04,
        power=0.96,
        qe_bias=3.0,
        tof_bias=0.10
    )

    add_table_block(
        writer, 105, "ILA", 6,
        2000, 8000, 100,
        base_scale=38.0,
        chg_scale=10.5,
        curve_scale=0.42,
        tof_scale=285.0,
        drift_scale=1.04,
        power=0.96,
        qe_bias=3.0,
        tof_bias=0.10
    )

    add_table_block(
        writer, 105, "ILA", 7,
        3000, 9000, 100,
        base_scale=38.0,
        chg_scale=10.5,
        curve_scale=0.42,
        tof_scale=285.0,
        drift_scale=1.04,
        power=0.96,
        qe_bias=3.0,
        tof_bias=0.10
    )


def add_155_family(writer):
    """
    155 mm.

    IMPORTANTE:
    HEA y M4A2 NO llevan CHG 4.

    CORRECCION NUEVA:
    HEA CHG 5 y M4A2 CHG 5 terminan en 8500 m.
    Asi, a 9173 m el emulador NO puede escoger CHG 5
    y debe subir a CHG 6, como en la hoja fisica.

    Dejamos:
    155 HE:   CHG 4, 5, 6, 7
    155 ILA:  CHG 4, 5, 6, 7
    155 HEA:  CHG 5, 6, 7
    155 M4A2: CHG 5, 6, 7
    """

    # ==================================================
    # 155 HE
    # CHG 4, 5, 6, 7
    # ==================================================

    add_table_block(
        writer, 155, "HE", 4,
        3000, 9000, 100,
        base_scale=39.5,
        chg_scale=13.2,
        curve_scale=0.32,
        tof_scale=252.0,
        drift_scale=1.00,
        power=1.00
    )

    add_table_block(
        writer, 155, "HE", 5,
        5000, 10000, 100,
        base_scale=39.5,
        chg_scale=13.2,
        curve_scale=0.32,
        tof_scale=252.0,
        drift_scale=1.00,
        power=1.00
    )

    add_table_block(
        writer, 155, "HE", 6,
        6000, 18000, 100,
        base_scale=39.5,
        chg_scale=13.2,
        curve_scale=0.32,
        tof_scale=252.0,
        drift_scale=1.00,
        power=1.00
    )

    add_table_block(
        writer, 155, "HE", 7,
        8000, 20000, 100,
        base_scale=39.5,
        chg_scale=13.2,
        curve_scale=0.32,
        tof_scale=252.0,
        drift_scale=1.00,
        power=1.00
    )

    # ==================================================
    # 155 HEA
    # SIN CHG 4.
    # CHG 5 hasta 8500.
    # CHG 6 cubre 9173.
    # ==================================================

    add_table_block(
        writer, 155, "HEA", 5,
        5000, 8500, 100,
        base_scale=39.5,
        chg_scale=13.2,
        curve_scale=0.32,
        tof_scale=252.0,
        drift_scale=0.94,
        power=1.08,
        qe_bias=-5.0,
        tof_bias=-0.30
    )

    add_table_block(
        writer, 155, "HEA", 6,
        6000, 19000, 100,
        base_scale=39.5,
        chg_scale=13.2,
        curve_scale=0.32,
        tof_scale=252.0,
        drift_scale=0.6267,
        power=1.08,
        qe_bias=-29.45,
        tof_bias=-0.62
    )

    add_table_block(
        writer, 155, "HEA", 7,
        8000, 24000, 100,
        base_scale=39.5,
        chg_scale=13.2,
        curve_scale=0.32,
        tof_scale=252.0,
        drift_scale=0.94,
        power=1.08,
        qe_bias=-5.0,
        tof_bias=-0.30
    )

    # ==================================================
    # 155 M4A2
    # SIN CHG 4.
    # CHG 5 hasta 8500.
    # Igual a HEA por ahora.
    # ==================================================

    add_table_block(
        writer, 155, "M4A2", 5,
        5000, 8500, 100,
        base_scale=39.5,
        chg_scale=13.2,
        curve_scale=0.32,
        tof_scale=252.0,
        drift_scale=0.94,
        power=1.08,
        qe_bias=-5.0,
        tof_bias=-0.30
    )

    add_table_block(
        writer, 155, "M4A2", 6,
        6000, 19000, 100,
        base_scale=39.5,
        chg_scale=13.2,
        curve_scale=0.32,
        tof_scale=252.0,
        drift_scale=0.6267,
        power=1.08,
        qe_bias=-29.45,
        tof_bias=-0.62
    )

    add_table_block(
        writer, 155, "M4A2", 7,
        8000, 24000, 100,
        base_scale=39.5,
        chg_scale=13.2,
        curve_scale=0.32,
        tof_scale=252.0,
        drift_scale=0.94,
        power=1.08,
        qe_bias=-5.0,
        tof_bias=-0.30
    )

    # ==================================================
    # 155 ILA
    # CHG 4, 5, 6, 7
    # Menos potente / mas lento provisional.
    # ==================================================

    add_table_block(
        writer, 155, "ILA", 4,
        3000, 8000, 100,
        base_scale=39.5,
        chg_scale=13.2,
        curve_scale=0.32,
        tof_scale=252.0,
        drift_scale=1.05,
        power=0.95,
        qe_bias=5.0,
        tof_bias=0.30
    )

    add_table_block(
        writer, 155, "ILA", 5,
        4000, 10000, 100,
        base_scale=39.5,
        chg_scale=13.2,
        curve_scale=0.32,
        tof_scale=252.0,
        drift_scale=1.05,
        power=0.95,
        qe_bias=5.0,
        tof_bias=0.30
    )

    add_table_block(
        writer, 155, "ILA", 6,
        5000, 15000, 100,
        base_scale=39.5,
        chg_scale=13.2,
        curve_scale=0.32,
        tof_scale=252.0,
        drift_scale=1.05,
        power=0.95,
        qe_bias=5.0,
        tof_bias=0.30
    )

    add_table_block(
        writer, 155, "ILA", 7,
        6000, 18000, 100,
        base_scale=39.5,
        chg_scale=13.2,
        curve_scale=0.32,
        tof_scale=252.0,
        drift_scale=1.05,
        power=0.95,
        qe_bias=5.0,
        tof_bias=0.30
    )


def main():
    with open(OUTPUT_PATH, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["ART", "PROJ", "CHG", "DIST", "QE", "TOF", "DRIFT"])

        add_105_family(writer)
        add_155_family(writer)

    print("tables.csv generado correctamente")
    print("Salida:", OUTPUT_PATH)
    print("Cambio aplicado:")
    print("155 HEA CHG 5 hasta 8500 m")
    print("155 M4A2 CHG 5 hasta 8500 m")
    print("A 9173 m debe seleccionar CHG 6")


if __name__ == "__main__":
    main()