from backend.routes.auth import auth_bp
from backend.routes.book import book_bp
from backend.routes.purchase import purchase_bp
from backend.routes.sale import sale_bp
from backend.routes.financial import financial_bp

__all__ = ['auth_bp', 'book_bp', 'purchase_bp', 'sale_bp', 'financial_bp']