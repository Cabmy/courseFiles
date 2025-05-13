from flask import jsonify

def success_response(data=None, message="操作成功"):
    """生成统一格式的成功响应
    
    Args:
        data: 响应数据，可选
        message: 成功消息，默认为"操作成功"
        
    Returns:
        JSON格式的响应数据
    """
    response = {
        "status": "success",
        "message": message
    }
    
    if data is not None:
        response["data"] = data
        
    return jsonify(response)

def error_response(message="操作失败", status_code=400):
    """生成统一格式的错误响应
    
    Args:
        message: 错误消息，默认为"操作失败"
        status_code: HTTP状态码，默认为400
        
    Returns:
        JSON格式的响应数据, 及HTTP状态码
    """
    response = {
        "status": "error",
        "message": message
    }
    
    return jsonify(response), status_code

def validation_error(errors):
    """生成表单验证错误的响应
    
    Args:
        errors: 错误字典或错误消息列表
        
    Returns:
        JSON格式的响应数据, 及HTTP状态码422
    """
    response = {
        "status": "error",
        "message": "输入数据验证失败",
        "errors": errors
    }
    
    return jsonify(response), 422

def pagination_response(query, schema, page, per_page, endpoint=None, **kwargs):
    """生成分页响应
    
    Args:
        query: 查询对象
        schema: marshmallow模式
        page: 当前页码
        per_page: 每页记录数
        endpoint: API端点
        **kwargs: 额外参数
        
    Returns:
        分页响应对象
    """
    from flask import url_for
    
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    data = schema.dump(pagination.items, many=True)
    
    # 构造分页元数据
    meta = {
        "page": page,
        "per_page": per_page,
        "total": pagination.total,
        "pages": pagination.pages,
        "has_next": pagination.has_next,
        "has_prev": pagination.has_prev
    }
    
    # 构造分页链接
    links = {}
    if endpoint:
        if pagination.has_prev:
            links["prev"] = url_for(endpoint, page=page-1, per_page=per_page, **kwargs)
        if pagination.has_next:
            links["next"] = url_for(endpoint, page=page+1, per_page=per_page, **kwargs)
        links["first"] = url_for(endpoint, page=1, per_page=per_page, **kwargs)
        links["last"] = url_for(endpoint, page=pagination.pages, per_page=per_page, **kwargs)
    
    return success_response({
        "items": data,
        "meta": meta,
        "links": links
    })