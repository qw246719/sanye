package com.sanye;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class SanyeApplication {

    public static void main(String[] args) {
        SpringApplication.run(SanyeApplication.class, args);
        System.out.println("==================== 启动成功 ====================");
    }
}
