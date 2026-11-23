"""Dark theme stylesheet for the desktop UI."""

DARK_STYLESHEET = """
QWidget {
    background-color: #12141a;
    color: #e8eaed;
    font-family: "Segoe UI", "Inter", sans-serif;
    font-size: 13px;
}

QMainWindow {
    background-color: #0f1115;
}

#sidebar {
    background-color: #16181f;
    border-right: 1px solid #2a2d36;
    min-width: 200px;
    max-width: 220px;
}

#sidebarTitle {
    font-size: 18px;
    font-weight: 600;
    padding: 16px 12px 8px 12px;
    color: #ffffff;
}

#navButton {
    text-align: left;
    padding: 10px 14px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #b4b8c0;
}

#navButton:hover {
    background-color: #252830;
    color: #ffffff;
}

#navButton[active="true"] {
    background-color: #2d3140;
    color: #7aa2ff;
}

#contentArea {
    background-color: #12141a;
}

StatCard, #statCard {
    background-color: #1a1d26;
    border: 1px solid #2a2d36;
    border-radius: 12px;
    padding: 16px;
}

#statCardTitle {
    color: #9aa0a8;
    font-size: 12px;
}

#statCardValue {
    font-size: 24px;
    font-weight: 600;
    color: #ffffff;
}

#sectionTitle {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 8px;
}

QTableWidget {
    background-color: #1a1d26;
    border: 1px solid #2a2d36;
    border-radius: 8px;
    gridline-color: #2a2d36;
}

QHeaderView::section {
    background-color: #22252e;
    color: #b4b8c0;
    padding: 8px;
    border: none;
    border-bottom: 1px solid #2a2d36;
}

QPushButton#primaryButton {
    background-color: #4c7dff;
    color: #ffffff;
    border: none;
    border-radius: 8px;
    padding: 10px 16px;
    font-weight: 600;
}

QPushButton#primaryButton:hover {
    background-color: #5c8aff;
}

QPushButton#primaryButton:disabled {
    background-color: #3a4a66;
    color: #8891a0;
}
"""