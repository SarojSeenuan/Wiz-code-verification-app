# S02検証用: 意図的にセキュリティ問題を含むPython設定ファイル
# WizCode自動スキャン機能検証用
# 本番環境では絶対に使用しないでください

"""
アプリケーション設定ファイル
本番環境用の設定を含む
"""

import os
from typing import Dict, Any

# 【脆弱性1】ハードコードされたデータベース認証情報
DATABASE_CONFIG = {
    'host': 'prod-payment-db.internal.aws.com',
    'port': 5432,
    'database': 'payment_production',
    'user': 'postgres_admin',
    'password': 'ProductionDB_P@ssw0rd_2024!',  # 絶対に平文で保存しないでください
    'sslmode': 'disable',  # 【脆弱性2】SSL無効化
    'connect_timeout': 30,
}

# 【脆弱性3】ハードコードされたAWS認証情報
AWS_CONFIG = {
    'aws_access_key_id': 'AKIAIOSFODNN7EXAMPLEKEY123',
    'aws_secret_access_key': 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLESECRET456',
    'region_name': 'us-east-1',
    'bucket_name': 'payment-app-production-bucket',
}

# 【脆弱性4】ハードコードされたStripe APIキー
STRIPE_CONFIG = {
    'secret_key': 'sk_live_51HqYZ2ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCD',
    'publishable_key': 'pk_live_51HqYZ2ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCD',
    'webhook_secret': 'whsec_1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
}

# 【脆弱性5】ハードコードされたJWT設定
JWT_CONFIG = {
    'secret_key': 'my-ultra-secret-jwt-key-for-production-2024',
    'algorithm': 'HS256',
    'expiration_hours': 720,  # 30日
    'refresh_token_secret': 'my-refresh-token-secret-key-production-2024',
}

# 【脆弱性6】ハードコードされたSendGrid APIキー
EMAIL_CONFIG = {
    'sendgrid_api_key': 'SG.ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmn.1234567890ABCDEFGHIJKLMNOPQRST',
    'from_email': 'noreply@payment-app.com',
    'admin_email': 'admin@payment-app.com',
}

# 【脆弱性7】ハードコードされたGitHub Personal Access Token
GITHUB_CONFIG = {
    'token': 'ghp_1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnop',
    'organization': 'my-company',
    'repository': 'payment-api',
}

# 【脆弱性8】ハードコードされたSlack Webhook URL
SLACK_CONFIG = {
    'webhook_url': 'https://hooks.slack.com/services/T1234ABCD/B5678EFGH/XXXXXXXXXXXXXXXXXXX12345',
    'channel': '#production-alerts',
    'username': 'Payment API Bot',
}

# 【脆弱性9】ハードコードされたTwilio認証情報
TWILIO_CONFIG = {
    'account_sid': 'AC1234567890abcdefghijklmnopqrstuv',
    'auth_token': '1234567890abcdefghijklmnopqrstuv',
    'phone_number': '+15555555555',
}

# 【脆弱性10】ハードコードされたRedis認証情報
REDIS_CONFIG = {
    'host': 'prod-redis.internal.aws.com',
    'port': 6379,
    'password': 'Redis_P@ssw0rd_2024!',
    'db': 0,
    'ssl': False,  # 【脆弱性11】SSL無効化
}

# 【脆弱性12】ハードコードされたElasticsearch認証情報
ELASTICSEARCH_CONFIG = {
    'hosts': ['https://prod-es.internal.aws.com:9200'],
    'http_auth': ('elastic', 'Elastic_P@ssw0rd_2024!'),
    'use_ssl': False,  # 【脆弱性13】SSL無効化
    'verify_certs': False,  # 【脆弱性14】証明書検証無効化
}

# 【脆弱性15】ハードコードされたRabbitMQ認証情報
RABBITMQ_CONFIG = {
    'host': 'prod-rabbitmq.internal.aws.com',
    'port': 5672,
    'username': 'rabbitmq_admin',
    'password': 'RabbitMQ_P@ssw0rd_2024!',
    'vhost': '/production',
}

# 【脆弱性16】ハードコードされたMongoDB認証情報
MONGODB_CONFIG = {
    'host': 'prod-mongodb.internal.aws.com',
    'port': 27017,
    'database': 'payment_production',
    'username': 'mongodb_admin',
    'password': 'MongoDB_P@ssw0rd_2024!',
    'authSource': 'admin',
    'ssl': False,  # 【脆弱性17】SSL無効化
}

# 【脆弱性18】ハードコードされた暗号化キー
ENCRYPTION_CONFIG = {
    'aes_key': 'abcdefghijklmnopqrstuvwxyz123456',  # 32バイト
    'iv': '1234567890abcdef',  # 16バイト
    'salt': 'my-secret-salt-2024',
}

# 【脆弱性19】デバッグモード有効化（本番環境）
DEBUG_CONFIG = {
    'debug': True,
    'verbose_logging': True,
    'log_sensitive_data': True,  # 【脆弱性20】機密データのロギング有効化
}

# 【脆弱性21】セキュリティヘッダー無効化
SECURITY_CONFIG = {
    'cors_enabled': True,
    'cors_origins': ['*'],  # 【脆弱性22】すべてのオリジンを許可
    'csrf_protection': False,  # 【脆弱性23】CSRF保護無効化
    'xss_protection': False,  # 【脆弱性24】XSS保護無効化
    'content_security_policy': None,  # 【脆弱性25】CSP未設定
}

# アプリケーション設定を返す関数
def get_config() -> Dict[str, Any]:
    """
    アプリケーション設定を取得する関数

    Returns:
        Dict[str, Any]: すべての設定を含む辞書
    """
    return {
        'database': DATABASE_CONFIG,
        'aws': AWS_CONFIG,
        'stripe': STRIPE_CONFIG,
        'jwt': JWT_CONFIG,
        'email': EMAIL_CONFIG,
        'github': GITHUB_CONFIG,
        'slack': SLACK_CONFIG,
        'twilio': TWILIO_CONFIG,
        'redis': REDIS_CONFIG,
        'elasticsearch': ELASTICSEARCH_CONFIG,
        'rabbitmq': RABBITMQ_CONFIG,
        'mongodb': MONGODB_CONFIG,
        'encryption': ENCRYPTION_CONFIG,
        'debug': DEBUG_CONFIG,
        'security': SECURITY_CONFIG,
    }


if __name__ == '__main__':
    # 【脆弱性26】設定をコンソールに出力（機密情報の露出）
    config = get_config()
    print('=== アプリケーション設定 ===')
    for section, values in config.items():
        print(f'\n[{section.upper()}]')
        for key, value in values.items():
            print(f'{key}: {value}')
