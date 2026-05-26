"""Presigned upload/download URLs for household files."""
from flask import Blueprint, jsonify, request

from auth_routes import get_current_user_doc
from household_service import ensure_user_household
from storage_service import (
    build_file_key,
    create_presigned_download,
    create_presigned_upload,
    storage_configured,
    user_can_access_file_key,
    validate_content_type,
)

storage_bp = Blueprint('storage', __name__, url_prefix='/api/storage')


@storage_bp.route('/status', methods=['GET'])
def storage_status():
    return jsonify({'configured': storage_configured()})


@storage_bp.route('/upload-url', methods=['POST'])
def presigned_upload():
    user = get_current_user_doc()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    if not storage_configured():
        return jsonify({'error': 'File storage is not configured on the server'}), 503

    data = request.json or {}
    filename = (data.get('filename') or 'file').strip()
    folder = (data.get('folder') or 'documents').strip()
    try:
        content_type = validate_content_type(data.get('contentType') or data.get('mimeType') or '')
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400

    household_id = ensure_user_household(user)
    try:
        file_key = build_file_key(household_id, folder, filename)
        upload_url = create_presigned_upload(file_key, content_type)
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    except RuntimeError as exc:
        return jsonify({'error': str(exc)}), 503

    return jsonify({
        'uploadUrl': upload_url,
        'fileKey': file_key,
        'contentType': content_type,
        'householdId': household_id,
    })


@storage_bp.route('/download-url', methods=['POST'])
def presigned_download():
    user = get_current_user_doc()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    if not storage_configured():
        return jsonify({'error': 'File storage is not configured on the server'}), 503

    data = request.json or {}
    file_key = (data.get('fileKey') or '').strip()
    filename = (data.get('filename') or '').strip() or None
    household_id = ensure_user_household(user)
    if not user_can_access_file_key(file_key, household_id):
        return jsonify({'error': 'Forbidden'}), 403
    try:
        download_url = create_presigned_download(file_key, filename=filename)
    except RuntimeError as exc:
        return jsonify({'error': str(exc)}), 503
    return jsonify({'downloadUrl': download_url})
