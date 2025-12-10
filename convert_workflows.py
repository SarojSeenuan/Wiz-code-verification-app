#!/usr/bin/env python3
"""
ワークフローファイルのWiz CLIコマンドをDocker run形式に変換するスクリプト
"""

import re
import sys

def convert_wizcli_to_docker(content):
    """wizcliコマンドをdocker run形式に変換"""

    # wizcli auth を docker run に変換
    content = re.sub(
        r'wizcli auth --id "\$\{\{ secrets\.WIZ_CLIENT_ID \}\}" --secret "\$\{\{ secrets\.WIZ_CLIENT_SECRET \}\}"',
        r'docker run --rm \\\n            -e WIZ_CLIENT_ID="${{ secrets.WIZ_CLIENT_ID }}" \\\n            -e WIZ_CLIENT_SECRET="${{ secrets.WIZ_CLIENT_SECRET }}" \\\n            wizcli:latest auth',
        content
    )

    # wizcli dir scan を docker run に変換
    def replace_dir_scan(match):
        indent = match.group(1)
        params = match.group(2)
        # パスを /scan/ プレフィックス付きに変更
        params = re.sub(r'--path \./taskflow-app/', '--path /scan/taskflow-app/', params)
        params = re.sub(r'--path \./scripts', '--path /scan/scripts', params)

        return f'{indent}docker run --rm \\\n{indent}  -e WIZ_CLIENT_ID="${{{{ secrets.WIZ_CLIENT_ID }}}}" \\\n{indent}  -e WIZ_CLIENT_SECRET="${{{{ secrets.WIZ_CLIENT_SECRET }}}}" \\\n{indent}  --mount type=bind,src="${{PWD}}",dst=/scan \\\n{indent}  wizcli:latest dir scan{params}'

    content = re.sub(
        r'(\s+)wizcli dir scan(.*?)(?=\n\s+[-\w]+:|\Z)',
        replace_dir_scan,
        content,
        flags=re.DOTALL
    )

    # wizcli iac scan を docker run に変換
    def replace_iac_scan(match):
        indent = match.group(1)
        params = match.group(2)
        # パスを /scan/ プレフィックス付きに変更
        params = re.sub(r'--path \./taskflow-app/', '--path /scan/taskflow-app/', params)
        # 出力ファイルパスも変更
        params = re.sub(r'--output ([^/\s]+)', r'--output /scan/\1', params)

        return f'{indent}docker run --rm \\\n{indent}  -e WIZ_CLIENT_ID="${{{{ secrets.WIZ_CLIENT_ID }}}}" \\\n{indent}  -e WIZ_CLIENT_SECRET="${{{{ secrets.WIZ_CLIENT_SECRET }}}}" \\\n{indent}  --mount type=bind,src="${{PWD}}",dst=/scan \\\n{indent}  wizcli:latest iac scan{params}'

    content = re.sub(
        r'(\s+)wizcli iac scan(.*?)(?=\n\s+[-\w]+:|\Z)',
        replace_iac_scan,
        content,
        flags=re.DOTALL
    )

    # wizcli docker scan を docker run に変換
    def replace_docker_scan(match):
        indent = match.group(1)
        params = match.group(2)
        # Dockerfileパスを /scan/ プレフィックス付きに変更
        params = re.sub(r'--dockerfile \./taskflow-app/', '--dockerfile /scan/taskflow-app/', params)
        # 出力ファイルパスも変更
        params = re.sub(r'--output ([^/\s,]+)', r'--output /scan/\1', params)

        return f'{indent}docker run --rm \\\n{indent}  -e WIZ_CLIENT_ID="${{{{ secrets.WIZ_CLIENT_ID }}}}" \\\n{indent}  -e WIZ_CLIENT_SECRET="${{{{ secrets.WIZ_CLIENT_SECRET }}}}" \\\n{indent}  -v /var/run/docker.sock:/var/run/docker.sock \\\n{indent}  --mount type=bind,src="${{PWD}}",dst=/scan \\\n{indent}  wizcli:latest docker scan{params}'

    content = re.sub(
        r'(\s+)wizcli docker scan(.*?)(?=\n\s+[-\w]+:|\Z)',
        replace_docker_scan,
        content,
        flags=re.DOTALL
    )

    return content

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python convert_workflows.py <workflow_file>")
        sys.exit(1)

    filename = sys.argv[1]

    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    converted = convert_wizcli_to_docker(content)

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(converted)

    print(f"Converted {filename}")
