#!/usr/bin/env python3

from datetime import datetime
import argparse
import json
import sqlite3
import typing


def cli_options():
    parser = argparse.ArgumentParser(description="datasource plugin renamer")
    parser.add_argument("db", help="Grafana sqlite database")
    return parser


def update_dashboard_type(data: typing.Dict[str, typing.Any]) -> bool:
    """
    modifies data in place!
    """
    updated = False

    def _update(element: typing.Dict[str, typing.Any]):
        nonlocal updated
        if element["datasource"]["type"] == "tribe-29-checkmk-datasource":
            updated = True
            element["datasource"]["type"] = "tribe29-checkmk-datasource"

    for panel in data["panels"]:
        _update(panel)
        for target in panel["targets"]:
            _update(target)

    return updated


def update_dashboard(cur: sqlite3.Cursor) -> None:
    for dashboard_id, data_str, creator in cur.execute("select id, data, created_by from dashboard"):
        data = json.loads(data_str)
        updated = update_dashboard_type(data)
        if not updated:
            continue
        version = data["version"]
        data["version"] += 1
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cur.execute(
            "insert into dashboard_version (dashboard_id, parent_version, restored_from, version,  created, created_by, message, data) values(?,?,?,?,?,?,?,?)",
            (
                dashboard_id,
                version,
                0,
                data["version"],
                now,
                creator,
                "datasource plugin renamer",
                json.dumps(data),
            ),
        )
        cur.execute(
            """UPDATE dashboard SET
            data = ?, version = ?, updated = ?
            WHERE id = ?""",
            (json.dumps(data), data["version"], now, dashboard_id),
        )

def update_datasource(cur: sqlite3.Cursor) -> None:
    now = datetime.now()
    cur.execute(
        """UPDATE data_source SET
        type = ?, updated = ?
        WHERE type = ?""",
        ("tribe29-checkmk-datasource", now, "tribe-29-checkmk-datasource")
    )


def main() -> None:
    args = cli_options().parse_args()
    con = sqlite3.connect(args.db)
    cur = con.cursor()

    update_dashboard(cur)
    update_datasource(cur)

    con.commit()
    con.close()


if __name__ == "__main__":
    main()
