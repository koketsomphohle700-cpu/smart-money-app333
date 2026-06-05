package com.smartmoney.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
public class HomeController {
    
    @GetMapping("/")
    public String index() {
        return "index";
    }
    
    @GetMapping("/api/health")
    @ResponseBody
    public String health() {
        return "{\"status\": \"UP\", \"message\": \"Smart Money App is running!\"}";
    }
}
