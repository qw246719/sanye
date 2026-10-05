package com.sanye.common;

/** 业务异常，统一被 GlobalExceptionHandler 转成 Result.fail */
public class BizException extends RuntimeException {

    public BizException(String message) {
        super(message);
    }
}
