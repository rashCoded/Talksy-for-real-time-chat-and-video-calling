package com.talksy.dto;

import com.talksy.model.Message;

import java.time.LocalDateTime;
import java.util.Map;

public class MessageDto {
    private Long id;
    private String content;
    private String senderUsername;
    private String receiverUsername;
    private Message.MessageType type;
    private Message.MessageStatus status;
    private String fileUrl;
    private String fileName;
    private String fileType;
    private LocalDateTime createdAt;
    private LocalDateTime readAt;
    private Map<String, String> reactions;

    // Constructors
    public MessageDto() {
    }

    public MessageDto(Long id, String content, String senderUsername, String receiverUsername,
            Message.MessageType type, Message.MessageStatus status, String fileUrl,
            String fileName, String fileType, LocalDateTime createdAt, LocalDateTime readAt,
            Map<String, String> reactions) {
        this.id = id;
        this.content = content;
        this.senderUsername = senderUsername;
        this.receiverUsername = receiverUsername;
        this.type = type;
        this.status = status;
        this.fileUrl = fileUrl;
        this.fileName = fileName;
        this.fileType = fileType;
        this.createdAt = createdAt;
        this.readAt = readAt;
        this.reactions = reactions;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getSenderUsername() {
        return senderUsername;
    }

    public void setSenderUsername(String senderUsername) {
        this.senderUsername = senderUsername;
    }

    public String getReceiverUsername() {
        return receiverUsername;
    }

    public void setReceiverUsername(String receiverUsername) {
        this.receiverUsername = receiverUsername;
    }

    public Message.MessageType getType() {
        return type;
    }

    public void setType(Message.MessageType type) {
        this.type = type;
    }

    public Message.MessageStatus getStatus() {
        return status;
    }

    public void setStatus(Message.MessageStatus status) {
        this.status = status;
    }

    public String getFileUrl() {
        return fileUrl;
    }

    public void setFileUrl(String fileUrl) {
        this.fileUrl = fileUrl;
    }

    public String getFileName() {
        return fileName;
    }

    public void setFileName(String fileName) {
        this.fileName = fileName;
    }

    public String getFileType() {
        return fileType;
    }

    public void setFileType(String fileType) {
        this.fileType = fileType;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getReadAt() {
        return readAt;
    }

    public void setReadAt(LocalDateTime readAt) {
        this.readAt = readAt;
    }

    public Map<String, String> getReactions() {
        return reactions;
    }

    public void setReactions(Map<String, String> reactions) {
        this.reactions = reactions;
    }
}