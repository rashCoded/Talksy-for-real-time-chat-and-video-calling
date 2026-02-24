package com.talksy.dto;

import com.talksy.model.FriendRequest;
import java.time.LocalDateTime;

public class FriendRequestDto {
    private Long id;
    private UserDto sender;
    private UserDto receiver;
    private FriendRequest.FriendRequestStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Constructors
    public FriendRequestDto() {}

    public FriendRequestDto(Long id, UserDto sender, UserDto receiver, 
                           FriendRequest.FriendRequestStatus status, 
                           LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.sender = sender;
        this.receiver = receiver;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public UserDto getSender() {
        return sender;
    }

    public void setSender(UserDto sender) {
        this.sender = sender;
    }

    public UserDto getReceiver() {
        return receiver;
    }

    public void setReceiver(UserDto receiver) {
        this.receiver = receiver;
    }

    public FriendRequest.FriendRequestStatus getStatus() {
        return status;
    }

    public void setStatus(FriendRequest.FriendRequestStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}